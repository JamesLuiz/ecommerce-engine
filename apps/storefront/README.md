# @dtc/storefront

Next.js App Router storefront for a Flowcheq tenant. One image serves every
tenant: branding, backend URL, publishable keys and the default region are read
from the container environment at request time, never baked in at build time.

## Runtime configuration

Copy `apps/storefront/.env.template` to `.env.local` for local development. The
provisioner injects the same variables into each tenant's Coolify application.

| Variable | Required | Purpose |
| --- | --- | --- |
| `MEDUSA_BACKEND_URL` | yes | Base URL of this tenant's Medusa backend |
| `MEDUSA_PUBLISHABLE_KEY` | yes | Publishable key created by `bootstrap-tenant` |
| `STORE_NAME` | no | Business name shown in the UI (default `Store`) |
| `BRAND_PRIMARY_COLOR` | no | CSS `--brand-primary` value |
| `BRAND_LOGO_URL` | no | Absolute logo URL |
| `STORE_DEFAULT_REGION` | no | Country code used without one in the URL |
| `STORE_BASE_URL` | no | Public origin for canonical URLs and sitemap |
| `STRIPE_PUBLISHABLE_KEY` | no | Enables Stripe at checkout |
| `MEDUSA_PAYMENTS_PUBLISHABLE_KEY` | no | Enables Medusa Payments |
| `ADYEN_CLIENT_KEY` | no | Enables Adyen |
| `ADYEN_ENVIRONMENT` | no | `test` (default) or `live` |

`src/lib/runtime-config.ts` exposes a lenient `getRuntimeConfig()` for module
load and a strict `requireRuntimeConfig()` for request handling.
`instrumentation.ts` fails the container at startup if the two required values
are missing.

All storefront pages are dynamic (`export const dynamic = "force-dynamic"`) so a
single build can serve any tenant. Do not reintroduce `NEXT_PUBLIC_*` values for
tenant-specific settings.

## Run

```bash
npm run dev --workspace=@dtc/storefront       # http://localhost:8000
npm run build --workspace=@dtc/storefront
npm run start --workspace=@dtc/storefront     # http://localhost:3000
npm run lint --workspace=@dtc/storefront
```

The storefront has no test suite; it is exercised through the backend
integration tests and the container acceptance checks in the build guide.

## Health

`GET /health` returns `{"status":"ok"}` without touching the backend, so the
container health check reports liveness while Medusa is still starting.
