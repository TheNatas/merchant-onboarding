# Merchant Onboarding

Small backend service that registers merchants: it validates and normalizes the input, rejects duplicates and stores the merchant as `PENDING`. Built with TypeScript, Express and Zod. See [docs/decisions.md](docs/decisions.md) for technical decisions, assumptions and the production persistence plan.

## Requirements
Node.js 20 or newer and npm.

## Install, run, test
```bash
npm install
npm run dev        # development server with reload, http://localhost:3000
npm run build && npm start   # compiled server (PORT env var, default 3000)
npm test           # unit and HTTP tests (Jest + supertest)
npm run typecheck
```

## API
`POST /merchants` with a JSON body:

| Field | Rule |
|---|---|
| `companyName` | required, at least 2 characters |
| `contactEmail` | required, valid email |
| `country` | required, two letters (stored uppercase) |
| `externalMerchantId` | required, unique (case-insensitive) |

Strings are trimmed. Unknown fields are ignored.

| Status | Meaning |
|---|---|
| `201` | Created. Body has `id`, the four fields, `status: "PENDING"`, `createdAt`. |
| `400` | `VALIDATION_ERROR` (with per-field `details`) or `INVALID_JSON`. |
| `409` | `DUPLICATE_MERCHANT`. |

```bash
curl -i -X POST http://localhost:3000/merchants \
  -H 'Content-Type: application/json' \
  -d '{"companyName":"Northstar Ltd","contactEmail":"ops@northstar.example","country":"gb","externalMerchantId":"northstar-001"}'
```

Storage is in memory, so data is lost on restart. `docs/decisions.md` explains how to persist it in production.

---

# Original exercise

## Purpose

We want to understand how you approach practical software development: building a small backend feature, validating and storing data, and thinking about integrations, security, and maintainability. We do not expect a production-ready platform or previous payment-industry experience.

## How to complete

- Complete the coding exercise below.
- You may use the programming language, framework, and tools you are most comfortable with.
- You may consult documentation. You are responsible for the work you submit.
- Do not use real customer data, payment card data or production credentials.

## Practical exercise – Merchant Registration

### Scenario

We want to reduce manual work during merchant onboarding. As a first step, we need a small backend feature that can register a merchant, validate the information received, and prevent duplicate registrations.

### Your task

Build a small, runnable function/service that registers a merchant. You may expose it through a simple REST API if you prefer, but a full web application is not required.

### Input fields

| Field | Example | Requirement |
|---|---|---|
| `companyName` | Northstar Ltd | Required; at least 2 characters |
| `contactEmail` | ops@northstar.example | Required; valid email format |
| `country` | GB | Required; two-letter country code |
| `externalMerchantId` | northstar-001 | Required; must be unique |

### Expected behaviour

- Validate the required fields before saving.
- Trim leading/trailing whitespace and store the country code in uppercase.
- Reject missing or invalid information with a clear error.
- Prevent duplicate `externalMerchantId` values.
- When successful, save the merchant with status `PENDING` and a creation timestamp.
- Return a clear success or error result. If you implement an HTTP API, use `201` for successful creation, `400` for invalid input, and `409` for a duplicate.

### What to submit

- Source code and tests (if applicable).
- A README explaining how to install, run, and test your solution.
- A short note describing your main technical decisions and any assumptions.
- If you use an in-memory store rather than a real database, briefly explain how you would persist the data safely in production.

## Submission

- Submit your GitHub repository URL by replying to the email containing the assessment instructions.
- If you do not use GitHub, you may submit your project as a ZIP file attachment by replying to the same email.
- Please make sure your Google Form response and coding exercise are both submitted before the deadline specified in the invitation email.
