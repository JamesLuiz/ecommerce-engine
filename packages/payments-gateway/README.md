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

## Deploy on Coolify

Do not deploy the gateway on Coolify through `docker-compose.yml`: Coolify sets
the compose project directory to the repository root, which breaks the file's
relative build context (`lstat /infra: no such file or directory`).

Instead, create one **Dockerfile** build-pack application from the repository
and branch, with dockerfile path `infra/docker/gateway.Dockerfile`:

- **gateway** — port 8080, health-check path `/healthz`, domain
  `gateway.example.com`. No start command needed.

The image's entrypoint handles the rest: it runs the idempotent migrations,
then starts the BullMQ worker and the HTTP API in the same container. If
either process exits, the whole container exits and Coolify restarts it, so
both halves always come back together. Redeploying is safe. (The compose file
still runs API, worker and migrations as three separate services for local
development — with arguments the entrypoint just execs `node <args>`.)

Environment variables, defined in the Coolify UI with **"Available at Build
Time" unchecked** (they are runtime-only; the image already sets `NODE_ENV` and
`PORT`, and keeping secrets out of the build avoids them appearing in build
logs):

| Variable | Notes |
| --- | --- |
| `DATABASE_URL`, `REDIS_URL` | the platform's Postgres and Redis |
| `PAYSTACK_SECRET_KEY`, `PAYSTACK_BASE_URL` | master account |
| `ADMIN_TOKEN` | must match `PAYMENTS_GATEWAY_ADMIN_TOKEN` in the root `.env` |
| `WEBHOOK_SIGNING_ROOT` | root key for vendor webhook secrets |
| `DASHBOARD_URL`, `ORDER_WEBHOOK_SECRET` | marks plan orders paid on `charge.success` |
| `LOG_LEVEL`, `REFUNDS_ENABLED`, `SETTLEMENT_CHANGE_COOLDOWN_HOURS` | optional |

Apps in the same Coolify project and environment share a Docker network, so
`DASHBOARD_URL` can use the dashboard application's name as the host (for
example `http://dashboard:9000`) instead of a public domain.

## Run

All configuration comes from `.env`; the compose file declares no variables of
its own. Point `DATABASE_URL` and `REDIS_URL` at the Postgres and Redis the
platform runs on, then:

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
Never put `PAYSTACK_SECRET_KEY` in a vendor Medusa instance; setup stores only
the vendor token returned by `POST /admin/vendors/ensure`. That endpoint is
idempotent: it reuses a valid `current_token`, rotates only a missing or stale
one, and merges supplied `allowed_origins` with the vendor's existing list.

`POST /v1/transactions/initialize` validates the storefront `callback_url`
origin against that list. Exact origins and wildcard subdomain patterns such as
`https://*.example.com` are accepted. A rejected origin returns
`invalid_callback_origin`; update it with `PATCH /admin/vendors/<vendor_id>`
without rotating the token.

When `DASHBOARD_URL` and `ORDER_WEBHOOK_SECRET` are set, a successful
`charge.success` also calls the dashboard internal endpoint
`POST /api/internal/orders/by-reference/:reference/paid`, which marks the
matching plan order paid and queues tenant provisioning. Without them, tenant
checkout payments still work; they just never trigger a deployment.

## Endpoints

- `GET /healthz`
- `POST /admin/vendors`, `POST /admin/vendors/ensure`, `GET /admin/vendors/:id`,
  `POST /admin/vendors/:id/rotate-token`, `POST /admin/vendors/:id/suspend`,
  `POST /admin/vendors/:id/activate`, `PATCH /admin/vendors/:id`
  — provisioner only (`ADMIN_TOKEN`)
- `GET /v1/vendor` — vendor token, returns the authenticated vendor's identity
  and webhook configuration
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

If Paystack rejects the stored subaccount during
`POST /v1/transactions/initialize`, the gateway marks the transaction failed and
returns `409 settlement_subaccount_invalid` with an actionable message instead of
a generic 500. Re-saving the settlement account with `PUT /v1/settlement` tries
to update the stored subaccount first; when Paystack reports it as invalid, the
gateway creates a fresh subaccount and stores the new code. `GET /v1/settlement`
returns `subaccount_code` and `paystack_mode` (`test` or `live`) for diagnosis.

`GET /admin/vendors/:id`, `POST /admin/vendors` and `POST /admin/vendors/ensure`
all return `webhook_signing_secret`, the HMAC secret used to sign forwarded
webhooks. It is derived from `WEBHOOK_SIGNING_ROOT` and the vendor id, so
rotating the root invalidates every vendor secret at once.

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
