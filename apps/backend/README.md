# Flowcheq tenant backend

Medusa backend for a single tenant. Every instance is created from the same
image; database URL, CORS origins, secrets and tenant data arrive as environment
variables at container start (see `apps/backend/.env.template`).

## Run and test

```bash
npm run dev --workspace=@dtc/backend          # http://localhost:9000, admin at /app
npm run build --workspace=@dtc/backend        # output in .medusa/server
npm run lint --workspace=@dtc/backend
npm run test:unit --workspace=@dtc/backend
```

Integration suites need a reachable PostgreSQL; run them from `apps/backend`.

## Tenant bootstrap

`src/scripts/bootstrap-tenant.ts` is idempotent and runs after migrations on
every container start. It reads `TENANT_CONFIG` (JSON, validated by
`@flowcheq/tenant-config`) and ensures the store name and currency, one region,
one sales channel named after the business, one `storefront` publishable key
linked to that channel, and one owner invite. It creates demo products only when
`SEED_DEMO=true`.

```bash
TENANT_CONFIG='{"slug":"acme","businessName":"Acme","ownerEmail":"owner@acme.test","plan":"starter"}' \
  npx medusa exec ./src/scripts/bootstrap-tenant.ts
```

## Payments

The only Paystack integration is the `paystack-gateway` payment provider. It
calls the central Flowcheq payments gateway with `GATEWAY_URL`, `GATEWAY_TOKEN`
and `GATEWAY_WEBHOOK_SECRET`. The Paystack master secret never reaches a tenant
container. Enable the provider on the store's region in the admin before
checkout can use it.

## Deployment

The container entrypoint runs `medusa db:migrate`, then the idempotent tenant
bootstrap, then the server. The image, environment variables and the full
deployment sequence are documented in the repository [README](../../README.md).
