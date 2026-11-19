# Merchant Onboarding

Small backend service that registers merchants: it validates and normalizes the input, rejects duplicates and stores the merchant as `PENDING`. Built with TypeScript, Express and Zod. See [docs/decisions.md](docs/decisions.md) for technical decisions, assumptions and the production persistence plan.

This project was built with AI assistance: Kiro CLI with Claude models (selected automatically by Kiro's Auto mode). See [docs/decisions.md](docs/decisions.md) for who decided what.

## Requirements
Node.js 20 or newer and npm.

## Install, run, test
```bash
npm install
npm run dev        # development server with reload, http://localhost:3000
npm run build && npm start   # compiled server (PORT env var, default 3000)
npm test           # unit and HTTP tests (Jest + supertest)
npm run test:coverage
npm run typecheck
```

## API
`POST /merchants` with a JSON body:

| Field | Rule |
|---|---|
| `companyName` | required, 2 to 200 characters |
| `contactEmail` | required, valid email, at most 254 characters |
| `country` | required, two letters (stored uppercase) |
| `externalMerchantId` | required, 1 to 100 characters, unique (case-insensitive) |
| `confirmSimilar` | optional boolean. Set to `true` to register a merchant that looks similar to an existing one |

Strings are trimmed. Unknown fields are ignored. Every error response has the form `{ error, message, details? }`.

| Status | Meaning |
|---|---|
| `201` | Created. Body has `id`, the four fields, `status: "PENDING"`, `createdAt`. |
| `400` | `VALIDATION_ERROR` (with per-field `details`) or `INVALID_JSON`. |
| `413` | `PAYLOAD_TOO_LARGE` (body over 100 KB). |
| `415` | `BAD_REQUEST` (for example an unsupported `Content-Encoding`). |
| `404` | `NOT_FOUND` (only `POST /merchants` exists). |
| `409` | `DUPLICATE_MERCHANT`, or `SIMILAR_MERCHANT_FOUND` (same normalized company name or same contact email as an existing merchant; nothing is saved until the request is resent with `confirmSimilar: true`). |

```bash
curl -i -X POST http://localhost:3000/merchants \
  -H 'Content-Type: application/json' \
  -d '{"companyName":"Northstar Ltd","contactEmail":"ops@northstar.example","country":"gb","externalMerchantId":"northstar-001"}'
```

To try the endpoint by hand, open [requests.http](requests.http) in VS Code (REST Client extension) or a JetBrains IDE. It has ten ready-made requests covering every response.

See [docs/api-guide.md](docs/api-guide.md) for request and response examples and an explanation of every response field.

Storage is in memory, so data is lost on restart. `docs/decisions.md` explains how to persist it in production.
