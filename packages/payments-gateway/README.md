# @flowcheq/payments-gateway

Central Flowcheq payments gateway. Talks to Paystack on behalf of every vendor
Medusa instance and owns settlement state.

The image runs three entrypoints from the same build:

| Entrypoint | Command | Purpose |
| --- | --- | --- |
| API | `node dist/index.js` | HTTP routes |
| Worker | `node dist/worker.js` | BullMQ webhook forwarding + reconciliation |
| Migrations | `node dist/migrate.js` | Applies `migrations/*.sql` once each |

The API and the worker are separate processes. Running only the API means
webhooks are received and stored but never forwarded to vendors.

## Run

Docker compose (Postgres + Redis + migrations + API + worker):

```bash
cp .env.example .env
docker compose up -d --build
```

Locally, against your own Postgres and Redis:

```bash
cp .env.example .env
npm run migrate:dev   # apply migrations
npm run dev           # API on http://localhost:8080
npm run dev:worker    # in a second terminal
```

## Deploy

Build from the repository root, because the Dockerfile installs the npm workspace:

```bash
docker build -f infra/docker/gateway.Dockerfile -t flowcheq/payments-gateway:latest .
```

Then run the three entrypoints against managed Postgres and Redis:

```bash
node dist/migrate.js    # once per release, before the API starts
node dist/index.js      # HTTP, exposed publicly over TLS
node dist/worker.js     # no inbound traffic needed
```

Point the Paystack dashboard webhook at `https://<gateway-host>/webhooks/paystack`.
Never put `PAYSTACK_SECRET_KEY` in a vendor Medusa instance; vendors only hold
the token returned by `POST /admin/vendors`.

## Endpoints

- `GET /healthz`
- `POST /admin/vendors`, `GET /admin/vendors/:id`,
  `POST /admin/vendors/:id/rotate-token`, `POST /admin/vendors/:id/suspend`,
  `POST /admin/vendors/:id/activate`, `PATCH /admin/vendors/:id`
  — provisioner only (`ADMIN_TOKEN`)
- `GET /v1/banks` — vendor token, returns the Paystack bank list for the vendor's
  currency plus a `test_mode` flag
- `POST /v1/accounts/resolve` — vendor token, resolves a bank account through
  Paystack `GET /bank/resolve`
- `GET /v1/settlement`, `PUT /v1/settlement` — vendor token
- `POST /v1/transactions/initialize`, `GET /v1/transactions/verify/:reference`,
  `GET /v1/transactions`, `GET /v1/transactions/:reference` — vendor token
- `POST /webhooks/paystack` — Paystack signed webhook

## Settlement

`PUT /v1/settlement` resolves the account with Paystack first and only then
creates or updates the vendor subaccount with `percentage_charge: 0`. Paystack
receives the plain bank code as `settlement_bank` plus the account number.
Changes are recorded in `settlement_audit` as `created` or `updated`.

The bank picker calls `GET /v1/banks`, which uses Paystack's cursor pagination
(`use_cursor=true` + `meta.next`) and deduplicates bank codes. The list is cached
for 24 hours in Redis when Redis is reachable and in process memory otherwise, so
a Redis outage does not block settlement setup.

In Paystack test mode, `GET /bank/resolve` is limited to bank code `001`, which
cannot back a subaccount. When the test-mode limit is hit, `PUT /v1/settlement`
skips the pre-resolve and lets `POST /subaccount` validate the account; the
account name is taken from the subaccount response. Live mode always resolves
first. Replace the test settlement account with a real one before switching to a
live Paystack key.

`GET /admin/vendors/:id` and `POST /admin/vendors` both return
`webhook_signing_secret`, the HMAC secret used to sign forwarded webhooks. It is
derived from `WEBHOOK_SIGNING_ROOT` and the vendor id, so rotating the root
invalidates every vendor secret at once.

## Reliability

- Every Paystack webhook is verified with `x-paystack-signature` (HMAC-SHA512 of
  the raw body with `PAYSTACK_SECRET_KEY`), deduplicated by sha256 of the raw
  body, and stored in `webhook_events`; transaction status moves forward only.
- The raw webhook is forwarded to the vendor's registered webhook URL through a
  BullMQ queue (`gateway-webhook-forward`) with `x-gateway-timestamp` and
  `x-gateway-signature` headers.
- A repeatable job (`gateway-reconcile-transactions`, every 5 minutes) verifies
  stale pending transactions and abandons the ones older than 24 hours.

## Errors

All errors use `{ "error": { "code": string, "message": string } }`.
