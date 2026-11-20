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

## First-time setup

`npm run setup:first --workspace=@dtc/backend` runs migrations, creates the
admin user, and then runs `src/scripts/ensure-first-time-store.ts`. That final
step prepares a fresh store for selling immediately:

- one Nigeria (`ng`) region using NGN, set as the store default;
- one Nigeria tax region and Nigeria Warehouse, linked to the storefront sales
  channel;
- a `storefront` publishable API key linked to that same sales channel;
- all enabled payment providers on the region, including Paystack;
- Standard and Express flat-rate shipping options priced at `0.00` by default;
- stock at Nigeria Warehouse for every inventory item, including products
  listed later via the `createProductsWorkflow` hook.

Everything is editable in Admin. Rerunning setup fills missing defaults but
does not overwrite prices, stock levels, or settings a merchant has changed.

For an existing store, the Nigeria defaults can be applied without recreating
the admin user:

```bash
npm run setup:defaults --workspace=@dtc/backend
npm run setup:checkout --workspace=@dtc/backend
```

To force shipping prices back to the free `0.00` starting point (for example on
a store created before this default existed), set
`FLOWCHEQ_RESET_SHIPPING_PRICES=true` for one `setup:checkout` run.

## Tenant bootstrap

`src/scripts/bootstrap-tenant.ts` is idempotent and runs after migrations on
every container start. It reads `TENANT_CONFIG` (JSON, validated by
`@flowcheq/tenant-config`) for the store identity, but first-time defaults are
always Nigeria/NGN with free shipping and Nigeria Warehouse. Once a store is
marked as bootstrapped, restarts preserve the merchant's Admin changes. Demo
products are created only when `SEED_DEMO=true`.

```bash
TENANT_CONFIG='{"slug":"acme","businessName":"Acme","ownerEmail":"owner@acme.test","plan":"starter"}' \
  npx medusa exec ./src/scripts/bootstrap-tenant.ts
```

Checkout defaults are created by `src/scripts/ensure-checkout-setup.ts`: a tax
region, the Nigeria Warehouse linked to the storefront sales channel, a shipping
fulfillment set with service zone and flat-rate options, all enabled payment
providers on the region, and stock at the default location for every inventory
item. Newly listed products are stocked into the same location, so a merchant
only needs to publish a product with a price.

## Payments

The only Paystack integration is the `paystack-gateway` payment provider. It
calls the central Flowcheq payments gateway with `GATEWAY_URL`, `GATEWAY_TOKEN`
and `GATEWAY_WEBHOOK_SECRET`. The Paystack master secret never reaches a tenant
container. Tenant bootstrap selects every enabled payment provider, including
Paystack, on the store's default region automatically.

## Deployment

The container entrypoint runs `medusa db:migrate`, then the idempotent tenant
bootstrap, then the server. The image, environment variables and the full
deployment sequence are documented in the repository [README](../../README.md).
