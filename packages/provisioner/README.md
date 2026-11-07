# @flowcheq/provisioner

Tenant provisioning steps and infrastructure clients for Flowcheq Commerce.

## What it does

- Runs the ordered provisioning step pipeline for a tenant:

  1. `validate` - parse the tenant config with the shared `TenantConfig` schema.
  2. `secrets` - generate and encrypt tenant secrets (`jwt_secret`, `cookie_secret`, `db_password`).
  3. `database` - create the isolated Postgres role and database for the tenant.
  4. `backend_app` - create or update the Coolify backend application from the backend image.
  5. `storefront_app` - create or update the Coolify storefront application from the storefront image.
  6. `dns` - placeholder for the DNS step (Phase 9).
  7. `deploy_backend` - trigger the backend deploy and wait for the deployment to succeed.
  8. `read_bootstrap` - connect to the tenant database and read bootstrap outputs.
  9. `deploy_storefront` - trigger the storefront deploy and wait for the deployment to succeed.
  10. `finalize` - mark the tenant as active.

- Persists step state through a pluggable `ProvisionStepStore` (Drizzle-backed by default,
  in-memory fallback for tests).
- Exposes the `CoolifyClient` used by the provisioning steps, with retries and typed errors.

## Coolify client

`createCoolifyClient({ baseUrl, token, fetchImpl, retries, retryBaseDelayMs })` implements the
Coolify REST API surface used by provisioning:

- `GET /applications` and `GET /applications/{uuid}`
- `POST /applications/dockerimage`
- `PATCH /applications/{uuid}`
- `POST /applications/{uuid}/envs`
- `POST /deploy?uuid=<uuid>`
- `GET /deployments/{uuid}`
- `POST /applications/{uuid}/rollback`
- `DELETE /applications/{uuid}`

The base URL is expected to include the API version prefix, for example
`https://<coolify-domain>/api/v1`. Requests send the API token as a bearer token and retry
transient failures up to `retries` times (default 3) with exponential backoff.

## Run and test

```bash
npm run test -w @flowcheq/provisioner
npm run lint -w @flowcheq/provisioner
npm run build -w @flowcheq/provisioner
```
