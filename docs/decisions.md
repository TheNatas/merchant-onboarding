# Technical decisions and assumptions

## Stack

| Area | Choice | Why |
|---|---|---|
| Language | TypeScript | Static types for the domain model and request input. |
| HTTP | Express | One endpoint does not justify a full framework. The request flow stays readable and the layering is explicit. |
| Validation | Zod | Schema, inferred types and normalization (`trim`, `toUpperCase`) in one place. Applied only at the HTTP boundary. |
| Unit and HTTP tests | Jest + supertest | Tests call the app through `createApp(deps)` without opening a port. |
| E2E | None (no Playwright) | There is no UI. HTTP-level tests cover the API behaviour. |
| Package manager | npm | Simplest setup for reviewers. |

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
- Layers: route/handler -> Zod schema (validation) -> service (business rules) -> `MerchantRepository` interface.
- Errors: a `DuplicateMerchantError` is mapped to HTTP 409 by an error-handling middleware. Validation failures return 400 with per-field messages.

## Behaviour decisions
- **Normalization:** all string inputs are trimmed. `country` is stored uppercase.
- **Country:** two ASCII letters (`^[A-Za-z]{2}$`). Not checked against the ISO 3166 list.
- **Unknown fields:** stripped, not rejected.
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
- Fuzzy matching such as edit distance is not used. A one-character difference is often a different merchant (`store-1` and `store-2`).

**This does not make the API stateful.** The server keeps nothing between the two requests. The confirmation is a field in the second request, and the server repeats all checks from scratch. The warning is advisory: another merchant may be added between the two requests, and only the ID uniqueness check is atomic.

**Costs to consider**
- **Slowness:** similarity needs a search over existing merchants, not a key lookup. The in-memory version scans every merchant. In production this needs an index, for example a stored normalized company name column with an index, or `pg_trgm` if fuzzy matching is added. An unindexed scan on every registration would not scale.
- **Annoyed users:** every false positive makes a legitimate user stop and confirm. Rules stay strict (equality after normalization, no fuzzy distance), and the response says which rule matched so the user can decide quickly. Shared mailboxes (`info@`, `ops@` of a group of companies) will trigger `SAME_CONTACT_EMAIL` for real distinct merchants. Track how often warnings are overridden, and loosen or drop a rule that is nearly always overridden.
- **API surface:** one more request field, one more error code and more tests.
- **Information exposure:** the warning reveals that other merchants exist and their names and IDs. This is acceptable for an internal onboarding tool. If the endpoint were exposed to merchants themselves, the warning should be removed or reduced.

**Not done:** storing a `similarTo` reference on the confirmed merchant for later review, and an `Idempotency-Key` header for safe retries.

## Storage
- The first version uses an in-memory repository behind the `MerchantRepository` interface. Data is lost on restart and is per process.
- **Production approach:** a relational database such as PostgreSQL, with a unique index on `lower(external_merchant_id)`. The insert runs without a prior read, and a unique-violation error is translated to `DuplicateMerchantError` (409). That keeps duplicate prevention correct under concurrency and across several service instances. Timestamps would use `timestamptz` and `status` a constrained type.
