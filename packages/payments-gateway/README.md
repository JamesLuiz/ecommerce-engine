# @flowcheq/payments-gateway

Central Flowcheq payments gateway. Talks to Paystack on behalf of every vendor
Medusa instance and owns settlement state.

## Run

```bash
docker compose up -d
```

or locally:

```bash
cp .env.example .env
npm run dev
```

## Endpoints

- `GET /healthz`
- `POST /admin/vendors`, `POST /admin/vendors/:id/rotate-token`,
  `POST /admin/vendors/:id/suspend`, `POST /admin/vendors/:id/activate`,
  `PATCH /admin/vendors/:id` — provisioner only (`ADMIN_TOKEN`)
- `GET /v1/banks` — vendor token
- `GET /v1/settlement`, `PUT /v1/settlement` — vendor token
- `POST /v1/transactions/initialize`, `GET /v1/transactions/verify/:reference`,
  `GET /v1/transactions`, `GET /v1/transactions/:reference` — vendor token
- `POST /webhooks/paystack` — Paystack signed webhook

## Reliability

- Every Paystack webhook is deduplicated by sha256 of the raw body and stored in
  `webhook_events`; transaction status is updated forward-only.
- The raw webhook is forwarded to the vendor's registered webhook URL through a
  BullMQ queue (`gateway-webhook-forward`) with per-vendor HMAC signature headers.
- A repeatable job (`gateway-reconcile-transactions`, every 5 minutes) verifies
  stale pending transactions and abandons the ones older than 24 hours.

## Errors

All errors use `{ "error": { "code": string, "message": string } }`.
