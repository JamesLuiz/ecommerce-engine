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

## Errors

All errors use `{ "error": { "code": string, "message": string } }`.
