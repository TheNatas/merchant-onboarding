# Technical decisions and assumptions

## Summary
- **Stack:** TypeScript, Express 5, Zod 4, Jest and supertest. NestJS and Playwright were considered and rejected as too heavy for one endpoint with no UI.
- **Behaviour:** inputs are trimmed, `country` is stored uppercase, and a new merchant is saved as `PENDING` with a creation time. Status codes: `201`, `400` (invalid input), `409` (duplicate).
- **Duplicates:** `externalMerchantId` is unique ignoring letter case, checked atomically in the repository.
- **Bonus, needs stakeholder approval:** a similarity warning (same normalized company name or same contact email) that the caller can confirm with `confirmSimilar: true`.
- **Storage:** in memory behind a `MerchantRepository` interface. For production: PostgreSQL with a unique index on `lower(external_merchant_id)`.
- **Known limits:** concurrent similar registrations can both pass the advisory warning. No authentication or rate limiting, since the exercise is a small feature.

The sections below give the details and the reasons.

## Stack

| Area | Choice | Why |
|---|---|---|
| Language | TypeScript | Static types for the domain model and request input. |
| HTTP | Express | One endpoint does not justify a full framework. The request flow stays readable and the layering is explicit. |
| Validation | Zod | Schema, inferred types and normalization (`trim`, `toUpperCase`) in one place. Applied only at the HTTP boundary. |
| Unit and HTTP tests | Jest + supertest | Tests call the app through `createApp(deps)` without opening a port. |
| E2E | None (no Playwright) | There is no UI. HTTP-level tests cover the API behaviour. |
| Package manager | npm | Simplest setup for reviewers. |
| Build | `tsc` with `tsconfig.build.json` (only `src`, output in `dist/`) | Tests are not compiled into the build. `tsconfig.json` also covers tests, for type checking and Jest. |
| CI | GitHub Actions: typecheck, test and build on Node 20 and 22 | Matches the `engines` field in `package.json`. |
| Linter and formatter | none | Decided against for this exercise. The style is kept consistent by hand. |

### Versions
- **TypeScript 5.9, not 7.x:** the latest release (7.0.2) does not expose the compiler API that `ts-jest` needs, so Jest could not run the tests. Version 5.9 is pinned until `ts-jest` supports 7.
- **Express 5:** rejected promises from async handlers reach the error middleware without extra wrapper code.
- **Zod 4:** `z.email()` and the `issues` array are used for validation and error output.
- **Node.js:** 20 or newer. Development used 22.

### Alternatives considered
- **NestJS:** gives structure and DI, but needs roughly twice the files and decorator setup for one endpoint. Worth it for larger apps.
- **class-validator:** the usual Nest choice. Not needed once Nest is dropped.
- **Playwright:** suited to browser tests. Not useful for an API with no UI.

## Architecture
- `createApp(repository)` builds the Express app with injected dependencies, so tests use an in-memory repository.
- Layers: route/handler -> Zod schema (validation) -> service -> `MerchantRepository` interface.
- The similarity rule lives in `similarity.ts`, a domain policy made of pure functions. The repository only provides plain lookups (`findByNormalizedCompanyName`, `findByContactEmail`). A future database repository therefore cannot define "similar" differently from the in-memory one.
- The `Merchant` type is in `merchant.ts` and the domain errors in `merchants/errors.ts`. Mapping errors to HTTP responses is in `error-handling.ts`, outside the domain folder, so the domain does not know about HTTP.
- Text normalization (company name, email, external ID) is in `normalize.ts`. It is shared by the policy and the repository.
- Errors: a `DuplicateMerchantError` is mapped to HTTP 409 by an error-handling middleware. Validation failures return 400 with per-field messages.

## Code layout and how it would grow
Today `src/merchants/` is flat, with one file per role: `routes.ts`, `schema.ts`, `service.ts`, `repository.ts`, `similarity.ts` (a domain policy, see the comment at the top of the file) and `normalize.ts` (text utilities). Files are named by the concept they hold, and a role suffix is used only for well-known roles (`.test`). The `merchant` prefix is not repeated because the folder already says it.

This is enough for one use case. When more use cases arrive (for example approve, update or list), or the folder reaches about 8 to 10 files, structure gets added. Two options were considered, and the choice is deferred until it is needed:

1. **Group by kind of file**, one folder per role, with an `index.ts` that exports each folder's contents:
   ```
   merchants/
     services/register.ts, approve.ts, index.ts
     policies/similarity.ts, index.ts
     utils/normalize.ts, index.ts
     repository.ts, schema.ts, routes.ts
   ```
   Each kind of file has a known place, so finding "all policies" is easy. Related files for one use case end up in different folders.
2. **Group by use case** (vertical slices), with plain role names inside:
   ```
   merchants/
     register/service.ts, schema.ts, routes.ts
     similarity/similarity.ts, normalize.ts
     repository.ts
   ```
   All files that change together live together. Shared pieces stay at the `merchants/` level.

Either option avoids repeating the same information twice, so a `register/` folder would not also contain `register.service.ts`. A uniform `<concept>.<role>.ts` naming (for example `register.service.ts`) was also considered. It was rejected for now because with one use case the concept part only repeats the folder name, and it would require one service class per use case. It becomes a reasonable choice if the folder stays flat while the number of use cases grows.

## Behaviour decisions
- **Normalization:** all string inputs are trimmed. `country` is stored uppercase.
- **Country:** two ASCII letters (`^[A-Za-z]{2}$`). Not checked against the ISO 3166 list.
- **Unknown fields:** stripped, not rejected.
- **Length limits:** `companyName` 200, `contactEmail` 254 (the usual email maximum), `externalMerchantId` 100 characters, and 100 KB for the whole body. Without limits, one request could carry very long strings, which cost memory and make the similarity scan slower. The numbers are assumptions and would be agreed with the real data owners.
- **Error format:** every error uses `{ error, message, details? }`. `error` is a stable code, `message` is text for people. Errors raised by Express before our code runs (malformed JSON, body too large, unsupported encoding) are mapped to the same format with a 4xx status, so a client error is never reported as a 500. Unknown routes return a JSON 404.
- **Created merchant:** `id` (UUID), the four input fields, `status: "PENDING"`, `createdAt` (ISO 8601, UTC).
- **Status codes:** `201` created, `400` invalid input, `409` duplicate.

### Duplicate detection: case-insensitive
- `externalMerchantId` values that differ only by letter case (`Northstar-001` / `northstar-001`) are duplicates.
- **Reason:** such a difference is most likely a typo by whoever registers the merchant, and the exercise asks to prevent duplicate registrations.
- **Storage:** the value is saved trimmed, in the case the user typed. Uniqueness uses a normalized key (trimmed, lowercased).
- **Atomicity:** the repository performs the check and the insert as one operation, so concurrent requests cannot both succeed.
- **Assumption and trade-off:** this assumes the external system does not treat IDs that differ only by case as different merchants. If it does, two real merchants could be rejected as duplicates.

### Similarity warning (implemented)
Duplicate handling has two tiers:
- **Hard block:** same `externalMerchantId` (case-insensitive) returns `409 DUPLICATE_MERCHANT`. The ID is a key other systems use, so two records that differ only by case would make lookups ambiguous.
- **Soft warning:** a new merchant that looks like an existing one returns `409 SIMILAR_MERCHANT_FOUND` with the similar merchants (`id`, `companyName`, `externalMerchantId`, `reasons`) and saves nothing. The client resends the same request with `"confirmSimilar": true` to register it anyway. The ID check always runs first, so a duplicate ID is never overridden by `confirmSimilar`.

Similarity rules (deliberately conservative):
- `SAME_COMPANY_NAME`: equal after lowercasing, removing accents and punctuation, collapsing spaces and dropping trailing legal suffixes (`Ltd`, `Limited`, `LLC`, `Inc`, `GmbH` and similar).
- `SAME_CONTACT_EMAIL`: equal after lowercasing.
- A company name made only of punctuation (`!!`) normalizes to an empty string and is never treated as a match, otherwise unrelated junk names would match each other.
- Fuzzy matching such as edit distance is not used. A one-character difference is often a different merchant (`store-1` and `store-2`).

**This does not make the API stateful.** The server keeps nothing between the two requests. The confirmation is a field in the second request, and the server repeats all checks from scratch. The warning is advisory: another merchant may be added between the two requests, and only the ID uniqueness check is atomic.

**Status of this feature:** the similarity warning is a bonus that goes beyond the exercise text. It comes from my own interpretation of "prevent duplicate registrations": exact ID matches are blocked, and likely repeat registrations are flagged. Before building it in a real scenario, the stakeholders (for example onboarding operations and compliance) should decide whether it is wanted, which signals count as similar, and whether a match should warn, block or send the registration to manual review.

**Costs to consider**
- **Slowness:** similarity needs a search over existing merchants, not a key lookup. The in-memory version scans every merchant. In production this needs an index, for example a stored normalized company name column with an index, or `pg_trgm` if fuzzy matching is added. An unindexed scan on every registration would not scale.
- **Annoyed users:** every false positive makes a legitimate user stop and confirm. Rules stay strict (equality after normalization, no fuzzy distance), and the response says which rule matched so the user can decide quickly. Shared mailboxes (`info@`, `ops@` of a group of companies) will trigger `SAME_CONTACT_EMAIL` for real distinct merchants. Track how often warnings are overridden, and loosen or drop a rule that is nearly always overridden.
- **API surface:** one more request field, one more error code and more tests.
- **Information exposure:** the warning reveals that other merchants exist and their names and IDs. This is acceptable for an internal onboarding tool. If the endpoint were exposed to merchants themselves, the warning should be removed or reduced.

**Known limitation: concurrent similar registrations.** The similarity check is a read followed by a separate insert, and it is not atomic. If two similar registrations with different IDs arrive at the same moment (for example `Northstar Ltd` as `northstar-001` and `Northstar Limited` as `northstar-002`), both can run the check before either is saved. Both then pass without a warning and both are stored. The ID check does not have this problem because `create()` checks and inserts in one step. Closing the gap would need a lock or a unique constraint on the normalized company name, which would turn the warning into a hard block. It is accepted because the warning is advisory, the case is rare, and the result is a missed warning, not corrupted data.

**Not done:** storing a `similarTo` reference on the confirmed merchant for later review, and an `Idempotency-Key` header for safe retries.

## Storage
- The first version uses an in-memory repository behind the `MerchantRepository` interface. Data is lost on restart and is per process.
- **Production approach:** a relational database such as PostgreSQL, with a unique index on `lower(external_merchant_id)`. The insert runs without a prior read, and a unique-violation error is translated to `DuplicateMerchantError` (409). That keeps duplicate prevention correct under concurrency and across several service instances. Timestamps would use `timestamptz` and `status` a constrained type.
