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

### Possible extension: similarity warning (not planned for the first version)
- Besides blocking exact (case-insensitive) duplicates, warn when a new registration looks similar to an existing one, for example "this merchant seems similar to X, are you sure it isn't already registered?".
- Open questions: which similarity rule (ignored punctuation, edit distance, same `contactEmail`, similar `companyName`), and how the client confirms (for example a `confirmSimilar: true` flag, with a distinct response when a warning is returned).

## Storage
- The first version uses an in-memory repository behind the `MerchantRepository` interface. Data is lost on restart and is per process.
- **Production approach:** a relational database such as PostgreSQL, with a unique index on `lower(external_merchant_id)`. The insert runs without a prior read, and a unique-violation error is translated to `DuplicateMerchantError` (409). That keeps duplicate prevention correct under concurrency and across several service instances. Timestamps would use `timestamptz` and `status` a constrained type.
