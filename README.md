# Flowcheq Commerce

Flowcheq Commerce is a privately owned ecommerce engine built to serve businesses in the ecommerce industry. It gives a business a complete online store: a branded storefront, a commerce backend and admin, managed hosting, and a central payments layer. The platform is multi-tenant: one deployment runs the control plane and payments gateway, then provisions an isolated store for each business.

This repository contains the whole platform:

- the staff control plane that creates and manages stores
- the provisioning worker that builds each store through Coolify
- the shared tenant backend and storefront images
- the central Paystack payments gateway
- the shared configuration packages and database schema

## Contents

- [What is in this repository](#what-is-in-this-repository)
- [How the pieces fit together](#how-the-pieces-fit-together)
- [Deployment overview](#deployment-overview)
- [Prerequisites](#prerequisites)
- [Domains and DNS](#domains-and-dns)
- [Environment files](#environment-files)
- [Step 1: Prepare infrastructure](#step-1-prepare-infrastructure)
- [Step 2: Deploy the payments gateway](#step-2-deploy-the-payments-gateway)
- [Step 3: Migrate the control-plane database](#step-3-migrate-the-control-plane-database)
- [Step 4: Deploy the dashboard and worker](#step-4-deploy-the-dashboard-and-worker)
- [Step 5: Build and publish images](#step-5-build-and-publish-images)
- [Step 6: Onboard a tenant](#step-6-onboard-a-tenant)
- [Step 7: Verify the deployment](#step-7-verify-the-deployment)
- [Upgrades and rollbacks](#upgrades-and-rollbacks)
- [Troubleshooting](#troubleshooting)
- [Security notes](#security-notes)
- [Current scope](#current-scope)
- [Local development](#local-development)
- [Manual single-tenant deployment](#manual-single-tenant-deployment)

## What is in this repository

| Path | What it is |
| --- | --- |
| `apps/backend` | Medusa 2.22 commerce backend for one tenant. One image serves every tenant; database URL, CORS, secrets and tenant config arrive as environment variables. The admin is served at `/app`. |
| `apps/storefront` | Next.js 16 storefront for one tenant. One image serves every tenant; branding, backend URL and publishable key are read at request time. |
| `apps/dashboard` | Next.js staff console for the control plane: tenants, provisioning steps, jobs, releases and audit log. |
| `apps/worker` | BullMQ worker that runs tenant provisioning and deprovisioning jobs. |
| `packages/db` | Drizzle schema and migrations for the control-plane database. |
| `packages/provisioner` | Provisioning steps and clients for Coolify, tenant Postgres databases and the payments gateway. |
| `packages/tenant-config` | Shared zod schema for tenant configuration. |
| `packages/storefront-config` | Shared zod schema for per-tenant storefront settings. |
| `packages/payments-gateway` | Central Paystack gateway: vendor registration, bank resolution, settlement, transactions, refunds and webhook forwarding. |
| `infra/docker` | Dockerfiles and the backend container entrypoint. |
| `.github/workflows/release.yml` | Tag-driven image build and release registration. |

## How the pieces fit together

```text
customer browser
  -> tenant storefront (Next.js)
  -> tenant backend (Medusa) -> tenant Postgres

tenant backend
  -> payments gateway -> Paystack

staff browser
  -> control-plane dashboard
  -> control-plane Postgres
  -> Redis -> provisioning worker -> Coolify
                                   -> tenant backend container
                                   -> tenant storefront container
```

Two groups of services exist:

**Central services, deployed once**

- control-plane dashboard
- provisioning worker
- control-plane Postgres and Redis
- payments gateway API and worker
- gateway Postgres and Redis

**Per-tenant services, created by the provisioner**

- one Medusa backend container
- one storefront container
- one Postgres database and role
- one vendor record in the payments gateway

The tenant backend and storefront use the same image for every tenant. Nothing tenant-specific is baked into the image.

## Deployment overview

The order matters because later services depend on earlier ones:

1. Prepare Postgres, Redis, DNS, the image registry and Coolify.
2. Deploy the payments gateway and point Paystack's webhook at it.
3. Apply the control-plane database migrations.
4. Deploy the dashboard and the provisioning worker.
5. Build and push the tenant backend and storefront images.
6. Create a tenant record and run the provisioning job.
7. Verify the whole chain.

## Prerequisites

### Servers

- A Linux server for the central services (dashboard, worker, gateway) with Docker 24+ and Docker Compose v2.
- A Linux server for Coolify and the tenant containers, also with Docker.
- A single server is enough to start, but production should separate the central services from tenant workloads.

Suggested sizing:

- central services: 2 vCPU, 4 GB RAM, 40 GB disk
- each tenant server: 2 vCPU, 4 GB RAM, 40 GB disk for a small store
- managed Postgres and Redis are recommended for production

### Software

- Docker 24+ with Compose v2
- Node.js 22.23.4 or newer and npm 11.19.1 for local builds (the images use Node 22)
- PostgreSQL 15+
- Redis 7+
- `git`, `curl`, `openssl`

### Accounts and credentials

- a domain you control, for example `example.com` for the platform and `example.store` for customer stores
- a container registry (GitHub Container Registry or Docker Hub)
- a Coolify installation with an API token
- a Paystack account and secret key
- optionally, a Brevo account for tenant transactional email

## Domains and DNS

The provisioner derives tenant hostnames from `STORE_BASE_DOMAIN`. With `STORE_BASE_DOMAIN=example.store`, tenant `acme` gets:

- storefront: `https://acme.example.store`
- backend and admin: `https://admin-acme.example.store`

Create these records:

| Record | Points to | Purpose |
| --- | --- | --- |
| `dashboard.example.com` | central server IP | staff dashboard |
| `gateway.example.com` | central server IP | payments gateway |
| `*.example.store` | Coolify server IP | every tenant storefront and backend |

A single wildcard covers both `acme.example.store` and `admin-acme.example.store` because `admin-acme` is one label. Terminate TLS at your reverse proxy or at Coolify/Traefik.

If you use Cloudflare, keep the records DNS-only while Coolify obtains certificates, then enable proxying if you want Cloudflare in front.

## Environment files

There are four environment templates, one per runtime:

| File | Used by |
| --- | --- |
| `.env` at the repository root | dashboard, worker and the provisioner |
| `packages/payments-gateway/.env` | gateway API and worker |
| `apps/backend/.env` | one tenant Medusa backend (the provisioner injects these in production) |
| `apps/storefront/.env.local` | one tenant storefront (the provisioner injects these in production) |

Create them from the templates:

```bash
cp .env.example .env
cp packages/payments-gateway/.env.example packages/payments-gateway/.env
cp apps/backend/.env.template apps/backend/.env            # local development only
cp apps/storefront/.env.template apps/storefront/.env.local # local development only
```

Generate secrets with:

```bash
openssl rand -hex 32
```

Use a different value for every secret. `SECRETS_ENCRYPTION_KEY` must be exactly 64 hex characters (32 bytes). Keep it stable after the first tenant is provisioned: changing it makes existing tenant secrets unreadable.

Each template lists only the variables its code reads. Optional variables can stay empty.

## Step 1: Prepare infrastructure

### 1.1 PostgreSQL

Create three databases and roles. The control plane and the gateway must not share a database.

```sql
create role flowcheq_control login password 'replace-me';
create database flowcheq_control owner flowcheq_control;

create role flowcheq_gateway login password 'replace-me';
create database flowcheq_gateway owner flowcheq_gateway;

-- The provisioner uses this role to create one role and database per tenant.
-- It is never used by tenant containers.
create role flowcheq_tenant_admin login password 'replace-me' createrole createdb;
```

The provisioner creates tenant databases named `t_<slug>` with a matching role, for example `t_acme`. Tenant containers connect with the generated role and password.

`TENANT_PG_HOST` and `TENANT_PG_PORT` must be reachable from the tenant containers, not just from the worker. If the worker and Coolify are on different networks, use the private or public address that the tenant containers can reach.

### 1.2 Redis

Use one Redis instance with separate logical databases, or separate instances:

| Consumer | Example URL |
| --- | --- |
| control plane (BullMQ) | `redis://:password@redis.example.com:6379/0` |
| payments gateway (BullMQ and bank cache) | `redis://:password@redis.example.com:6379/1` |
| tenants (optional) | `redis://:password@redis.example.com:6379/2` |

If the password contains special characters, URL-encode it. The tenant Redis is optional: Medusa falls back to an in-memory event bus and workflow engine when `REDIS_URL` is unset, but production stores should use Redis.

The provisioner passes the same `TENANT_REDIS_URL` to every tenant. If you need strict Redis isolation between tenants, use separate instances or extend the provisioner to assign a database or key prefix per tenant.

### 1.3 Container registry

The release workflow pushes images to:

```text
ghcr.io/<github-owner>/<github-repository>/<name>:<tag>
```

For example, `ghcr.io/acme/flowcheq-commerce/backend:v1.0.0`. Set `BACKEND_IMAGE` and `STOREFRONT_IMAGE` to the same paths without the tag:

```bash
BACKEND_IMAGE=ghcr.io/acme/flowcheq-commerce/backend
STOREFRONT_IMAGE=ghcr.io/acme/flowcheq-commerce/storefront
```

Make the packages public, or give Coolify registry credentials so it can pull private images.

### 1.4 Coolify

1. Install Coolify on the tenant server and complete its setup.
2. Create a project and an environment, for example `production`.
3. Create an API token with permission to manage applications and deployments.
4. Add the container registry credentials in Coolify.
5. Note the project UUID, the server UUID and the environment name.

Put them in the root `.env`:

```bash
COOLIFY_URL=https://coolify.example.com
COOLIFY_TOKEN=replace-me
COOLIFY_PROJECT_UUID=replace-me
COOLIFY_SERVER_UUID=replace-me
COOLIFY_ENVIRONMENT_NAME=production
```

Verify the token before going further:

```bash
curl -fsS "$COOLIFY_URL/api/v1/projects" \
  -H "Authorization: Bearer $COOLIFY_TOKEN"
```

The worker creates two Docker-image applications per tenant:

| Application | Port | Health check | Domain |
| --- | --- | --- | --- |
| `backend-<slug>` | 9000 | `/health` | `https://admin-<slug>.<STORE_BASE_DOMAIN>` |
| `storefront-<slug>` | 3000 | `/health` | `https://<slug>.<STORE_BASE_DOMAIN>` |

### 1.5 Paystack

1. Create a Paystack account and complete verification.
2. Copy the secret key. It belongs only in the gateway environment.
3. Leave the webhook URL until the gateway is running; it will be `https://gateway.example.com/webhooks/paystack`.

Test mode has a daily limit on live bank resolves. Bank code `001` resolves with any 10 digits in test mode, but it cannot back a subaccount. Use a real settlement account before switching to a live key.

## Step 2: Deploy the payments gateway

The gateway is central. Every tenant backend calls it with a per-vendor token. The Paystack master secret never leaves the gateway.

### 2.1 Configure

```bash
cd packages/payments-gateway
cp .env.example .env
```

Set at least:

```bash
NODE_ENV=production
PORT=8080
LOG_LEVEL=info

DATABASE_URL=postgres://flowcheq_gateway:replace-me@db.example.com:5432/flowcheq_gateway
REDIS_URL=redis://:replace-me@redis.example.com:6379/1

PAYSTACK_SECRET_KEY=sk_live_replace-me
PAYSTACK_BASE_URL=https://api.paystack.co

# Provisioner credential for /admin/* routes.
ADMIN_TOKEN=replace-with-openssl-rand-hex-32

# Root key for deriving each vendor's webhook signing secret.
# Rotating it invalidates every vendor secret at once.
WEBHOOK_SIGNING_ROOT=replace-with-openssl-rand-hex-32

# Control plane (dashboard). On a successful plan payment the gateway marks the
# order paid and queues provisioning. Both must match the root `.env`.
DASHBOARD_URL=https://dashboard.example.com
ORDER_WEBHOOK_SECRET=replace-with-openssl-rand-hex-32

REFUNDS_ENABLED=false
SETTLEMENT_CHANGE_COOLDOWN_HOURS=0
```

`ADMIN_TOKEN` must match `PAYMENTS_GATEWAY_ADMIN_TOKEN` in the root `.env`. `ORDER_WEBHOOK_SECRET` must match the same variable in the root `.env`.

### 2.2 Run with the bundled Postgres and Redis

The package ships a compose file for a self-contained deployment:

```bash
cd packages/payments-gateway
docker compose up -d --build
docker compose ps
curl -fsS http://localhost:8080/healthz
```

The compose stack runs migrations once, then starts the API and the worker as separate services. The `gateway` service exposes port 8080. The `worker` service receives no inbound traffic.

The compose file overrides `DATABASE_URL` and `REDIS_URL` to point at its own `pg` and `redis` services. To use managed services instead, skip compose and use the commands below.

### 2.3 Run against managed Postgres and Redis

Build the image from the repository root:

```bash
docker build -f infra/docker/gateway.Dockerfile \
  -t ghcr.io/acme/flowcheq-commerce/gateway:latest .
```

The image entrypoint is `node`, so pass the script name as the command:

```bash
# Once per release, before the API starts.
docker run --rm --env-file packages/payments-gateway/.env \
  ghcr.io/acme/flowcheq-commerce/gateway:latest dist/migrate.js

docker run -d --name flowcheq-gateway \
  --env-file packages/payments-gateway/.env \
  -p 8080:8080 \
  ghcr.io/acme/flowcheq-commerce/gateway:latest

docker run -d --name flowcheq-gateway-worker \
  --env-file packages/payments-gateway/.env \
  ghcr.io/acme/flowcheq-commerce/gateway:latest dist/worker.js
```

The API and the worker are separate processes. Running only the API means Paystack webhooks are received and stored but never forwarded to tenant backends.

### 2.4 Expose and verify

Put `gateway.example.com` in front of port 8080 with TLS, then:

```bash
curl -fsS https://gateway.example.com/healthz
# {"status":"ok"}
```

In the Paystack dashboard, set the webhook URL to:

```text
https://gateway.example.com/webhooks/paystack
```

### 2.5 Register a vendor

The provisioner registers a vendor automatically when `GATEWAY_URL` and `PAYMENTS_GATEWAY_ADMIN_TOKEN` are set in the root `.env`. For a manual deployment, call the admin route:

```bash
curl -fsS -X POST https://gateway.example.com/admin/vendors \
  -H "Authorization: Bearer $PAYMENTS_GATEWAY_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "acme",
    "name": "Acme",
    "webhook_url": "https://admin-acme.example.store/hooks/payment/paystack-gateway_paystack-gateway",
    "allowed_origins": [
      "https://acme.example.store",
      "https://admin-acme.example.store"
    ]
  }'
```

The response contains `vendor_id`, `token` and `webhook_signing_secret`. Put the token and secret into the tenant backend as `GATEWAY_TOKEN` and `GATEWAY_WEBHOOK_SECRET`.

## Step 3: Migrate the control-plane database

Create the root `.env` from the example and fill in the control-plane values:

```bash
cp .env.example .env
```

Minimum for the control plane:

```bash
CONTROL_PLANE_DATABASE_URL=postgres://flowcheq_control:replace-me@db.example.com:5432/flowcheq_control
REDIS_URL=redis://:replace-me@redis.example.com:6379/0
SECRETS_ENCRYPTION_KEY=replace-with-64-hex-characters
RELEASE_WEBHOOK_SECRET=replace-with-openssl-rand-hex-32
ORDER_WEBHOOK_SECRET=replace-with-openssl-rand-hex-32

STORE_BASE_DOMAIN=example.store
BACKEND_IMAGE=ghcr.io/acme/flowcheq-commerce/backend
STOREFRONT_IMAGE=ghcr.io/acme/flowcheq-commerce/storefront

TENANT_PG_ADMIN_URL=postgres://flowcheq_tenant_admin:replace-me@db.example.com:5432/postgres
TENANT_PG_HOST=db.example.com
TENANT_PG_PORT=5432
TENANT_REDIS_URL=redis://:replace-me@redis.example.com:6379/2

COOLIFY_URL=https://coolify.example.com
COOLIFY_TOKEN=replace-me
COOLIFY_PROJECT_UUID=replace-me
COOLIFY_SERVER_UUID=replace-me
COOLIFY_ENVIRONMENT_NAME=production

GATEWAY_URL=https://gateway.example.com
PAYMENTS_GATEWAY_ADMIN_TOKEN=replace-with-the-gateway-admin-token
```

Install dependencies and apply the migrations:

```bash
npm ci
npm run build --workspace=@flowcheq/db

CONTROL_PLANE_DATABASE_URL="postgres://flowcheq_control:replace-me@db.example.com:5432/flowcheq_control" \
  npm run migrate --workspace=@flowcheq/db
```

Verify the tables exist:

```bash
psql "$CONTROL_PLANE_DATABASE_URL" -c "\dt"
```

You should see `customers`, `sessions`, `plans`, `orders`, `tenants`, `tenant_secrets`, `provision_steps`, `releases` and `audit_log`.

Run this migration step again after every control-plane upgrade, before starting a new dashboard or worker image.

## Step 4: Deploy the dashboard and worker

### 4.1 Build the images

From the repository root:

```bash
docker build -f infra/docker/dashboard.Dockerfile \
  -t ghcr.io/acme/flowcheq-commerce/dashboard:latest .

docker build -f infra/docker/worker.Dockerfile \
  -t ghcr.io/acme/flowcheq-commerce/worker:latest .
```

### 4.2 Run the containers

The dashboard and worker both read the root `.env`. Pass it with `--env-file`.

```bash
docker run -d --name flowcheq-dashboard \
  --env-file .env \
  -p 9000:9000 \
  ghcr.io/acme/flowcheq-commerce/dashboard:latest

docker run -d --name flowcheq-worker \
  --env-file .env \
  ghcr.io/acme/flowcheq-commerce/worker:latest
```

The dashboard container listens on 9000. Local `npm run dev` uses 3000; production images always use 9000.

Put `dashboard.example.com` in front of port 9000 with TLS and verify:

```bash
curl -fsS https://dashboard.example.com/api/health
# {"status":"ok"}
```

The worker has no inbound port. Check its logs to confirm it started:

```bash
docker logs --tail 50 flowcheq-worker
```

You should see `"message":"provisioning worker started"`.

### 4.3 Create the first staff account

Staff accounts live in the `customers` table with `role = 'staff'`. Run the script inside the dashboard container:

```bash
docker exec -it flowcheq-dashboard \
  npm run staff:create -- --email you@example.com --name "Your Name"
```

The password is prompted and must be at least 12 characters. For automation, pass `STAFF_PASSWORD` in the environment:

```bash
docker exec -it -e STAFF_PASSWORD='at-least-12-chars' flowcheq-dashboard \
  npm run staff:create -- --email you@example.com --name "Your Name"
```

Alternatively, run it from a local checkout against the production database:

```bash
CONTROL_PLANE_DATABASE_URL="postgres://flowcheq_control:replace-me@db.example.com:5432/flowcheq_control" \
  npm run staff:create --workspace=@dtc/dashboard -- \
  --email you@example.com --name "Your Name"
```

Log in at `https://dashboard.example.com/login`. The dashboard redirects `/admin` to `/login` when no session cookie is present and rejects accounts whose role is not `staff`.

## Step 5: Build and publish images

### Option A: release workflow

Push a version tag:

```bash
git tag v1.0.0
git push origin v1.0.0
```

The workflow builds and pushes:

- `ghcr.io/<owner>/<repo>/backend:<tag>` and `:latest`
- `ghcr.io/<owner>/<repo>/storefront:<tag>` and `:latest`
- `ghcr.io/<owner>/<repo>/dashboard:<tag>` and `:latest`
- `ghcr.io/<owner>/<repo>/worker:<tag>` and `:latest`

It then registers the release with the dashboard when `DASHBOARD_URL` and `RELEASE_WEBHOOK_SECRET` are configured as repository secrets.

The gateway is not part of that workflow. Build and push it separately with the command in Step 2.

### Option B: manual builds

```bash
export REGISTRY=ghcr.io/acme/flowcheq-commerce

docker build -f infra/docker/backend.Dockerfile    -t "$REGISTRY/backend:latest" .
docker build -f infra/docker/storefront.Dockerfile -t "$REGISTRY/storefront:latest" .
docker build -f infra/docker/dashboard.Dockerfile  -t "$REGISTRY/dashboard:latest" .
docker build -f infra/docker/worker.Dockerfile     -t "$REGISTRY/worker:latest" .
docker build -f infra/docker/gateway.Dockerfile    -t "$REGISTRY/gateway:latest" .

docker login ghcr.io
docker push "$REGISTRY/backend:latest"
docker push "$REGISTRY/storefront:latest"
docker push "$REGISTRY/dashboard:latest"
docker push "$REGISTRY/worker:latest"
docker push "$REGISTRY/gateway:latest"
```

The tenant backend and storefront images are pulled by Coolify. Make sure the registry paths in `BACKEND_IMAGE` and `STOREFRONT_IMAGE` match what you pushed.

## Step 6: Onboard a tenant

The normal path is order-driven: a customer record, a plan order and the
`signup_payload` that describes the store. When the order is marked paid, the
dashboard creates the tenant and queues provisioning automatically. Use the
staff dashboard (**Orders > Create order**) or `POST /api/admin/orders`.
Choosing `paid` in the form deploys immediately; leaving it `pending` waits for
the payment webhook.

You can still create the rows by hand, which is useful for a customer that is
already provisioned outside the checkout flow.

### 6.1 Create the customer and tenant rows

The control-plane `customers` row is the billing/account record. It is separate from the owner's login in the tenant admin. The simplest way to create a valid row is to use the staff script, then change its role:

```bash
npm run staff:create --workspace=@dtc/dashboard -- \
  --email owner@acme.test --name "Acme Owner"
# enter a temporary password when prompted

psql "$CONTROL_PLANE_DATABASE_URL" -c \
  "update customers set role = 'customer' where email = 'owner@acme.test';"
```

If you already have a customer row, reuse its id.

Insert the tenant with a configuration that satisfies `packages/tenant-config`:

```sql
insert into tenants (customer_id, slug, config, status, version)
values (
  'replace-with-customer-id',
  'acme',
  '{
    "slug": "acme",
    "businessName": "Acme",
    "ownerEmail": "owner@acme.test",
    "plan": "starter",
    "currency": "NGN",
    "region": "ng",
    "brand": { "primaryColor": "#111111" },
    "features": {
      "multiVendor": false,
      "paystack": true,
      "flutterwave": true,
      "stripe": false
    }
  }'::jsonb,
  'provisioning',
  'latest'
)
returning id;
```

The slug must be 3 to 32 characters, lowercase, and may contain letters, digits and hyphens. Reserved slugs such as `admin`, `api` and `dashboard` are rejected. The slug determines the database name `t_<slug>` and the two hostnames.

### 6.2 Queue provisioning

Order-driven tenants are queued automatically when the order is paid. For a
tenant created by hand, open it in the dashboard and click **Retry failed
steps**. The action resets failed or running steps and adds a job to the
`provision` queue. The worker runs these steps in order:

1. `validate` validates the tenant config
2. `secrets` generates the JWT, cookie and database secrets and registers the vendor in the payments gateway
3. `database` creates the tenant Postgres role and database
4. `backend_app` creates or updates the Coolify backend application
5. `storefront_app` creates or updates the Coolify storefront application
6. `dns` is a placeholder; wildcard DNS is managed manually
7. `deploy_backend` deploys the backend and waits for it
8. `read_bootstrap` reads the publishable key and owner invite from the tenant database
9. `deploy_storefront` deploys the storefront and waits for it
10. `finalize` marks the tenant active and stores the URLs

Watch the tenant page until every step is `success`. The backend and storefront containers run their own startup checks:

- the backend runs `medusa db:migrate` and `bootstrap-tenant` on every boot
- the bootstrap creates the store, region, sales channel, `storefront` publishable key and owner invite

### 6.3 Send the owner invite

The bootstrap creates a Medusa admin invite for `ownerEmail`. Retrieve the token from the tenant database:

```bash
psql "postgres://t_acme:<generated-password>@db.example.com:5432/t_acme" -c \
  "select token from invite
   where email = 'owner@acme.test'
     and accepted = false
     and deleted_at is null
   order by created_at desc
   limit 1;"
```

Send the owner:

```text
https://admin-acme.example.store/app/invite?token=<token>
```

The owner sets a password and uses the admin at `https://admin-acme.example.store/app`.

### 6.4 Set up payments

1. Open the tenant admin and go to **Payments**.
2. Enter the settlement bank and the 10-digit account number, then save.
3. The gateway resolves the account and creates or updates the Paystack subaccount.
4. Go to **Settings > Regions** and add the **Paystack Gateway** payment provider to the region so checkout offers it.

The gateway resolves the account holder name before saving in live mode. In Paystack test mode, the daily live-resolve limit can be exhausted; use bank code `001` for a resolve test, or let the subaccount call validate the account. Replace the test settlement account with the real one before switching to a live Paystack key.

### 6.5 Customise the storefront

The owner can change branding, theme, homepage, navigation, footer and SEO in **Admin > Storefront**. These settings are stored in the store metadata and read by the storefront at request time, so most changes do not need a redeploy.

The footer includes a **Powered by Flowcheq Commerce** link. It points to `/<countryCode>/platform`, which explains the platform to shoppers. The link is hidden when the owner turns off `footer.poweredBy` in the storefront settings.

## Step 7: Verify the deployment

Run these checks after provisioning:

```bash
curl -fsS https://gateway.example.com/healthz
curl -fsS https://dashboard.example.com/api/health
curl -fsS https://admin-acme.example.store/health
curl -fsS https://acme.example.store/health
```

Then verify by hand:

- the dashboard login works and the tenant shows every provisioning step as `success`
- a paid order on the **Orders** page creates the tenant and queues a provisioning job; the audit log shows `order.paid`
- the owner invite link opens the tenant admin and accepts a password
- the storefront home page loads products from the tenant backend
- the admin can create a product and see it in the storefront
- a test checkout reaches Paystack and the order appears in the admin
- a Paystack test webhook reaches the gateway and is forwarded to the tenant backend
- the footer link opens `https://acme.example.store/<countryCode>/platform`

If a webhook is received but the order does not update, confirm the gateway worker is running and the vendor `webhook_url` points at the tenant backend.

## Upgrades and rollbacks

### Control plane and gateway

1. Apply database migrations before starting the new images:
   - control plane: `npm run migrate --workspace=@flowcheq/db`
   - gateway: `dist/migrate.js`
2. Pull the new dashboard, worker and gateway images.
3. Restart the containers.
4. Check `/api/health` and `/healthz`.

### Tenant backend and storefront

1. Build and push a new image tag.
2. Update the tenant's version:

```sql
update tenants set version = 'v1.1.0' where slug = 'acme';
```

3. Open the tenant in the dashboard and click **Redeploy**. The action re-runs the application, deployment and bootstrap steps with the new tag.

To roll back, set `version` to the previous tag and redeploy again.

Release rings are recorded intent only. Automated ring rollout, snapshotting and automatic rollback are not enabled yet; redeploy tenants individually from the tenant page. `pinned_version` is reserved and not used by the provisioner.

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `SECRETS_ENCRYPTION_KEY is required` or `must be 64 hex characters` | missing or malformed key | generate 32 random bytes with `openssl rand -hex 32` |
| Control-plane requests fail with `ECONNREFUSED` | wrong database host, port or database name | test with `psql "$CONTROL_PLANE_DATABASE_URL"` |
| Redis fails with `WRONGPASS` or `NOAUTH` | password missing or not URL-encoded | use `redis://:password@host:6379/0` and encode special characters |
| Dashboard login returns 401 | wrong email or password | recreate the account with `staff:create` |
| Dashboard login returns 403 | the account role is not `staff` | set `role = 'staff'` in `customers` |
| Worker logs `ECONNREFUSED` and jobs stay waiting | worker cannot reach Redis | fix `REDIS_URL` and restart the worker |
| Coolify returns 401 | invalid `COOLIFY_TOKEN` | create a new API token and update `.env` |
| Coolify returns 404 | wrong project or server UUID | copy the UUIDs from Coolify |
| Coolify cannot pull the image | private package or wrong registry path | add registry credentials or make the package public; check `BACKEND_IMAGE` and `STOREFRONT_IMAGE` |
| Backend health check fails | database, `TENANT_CONFIG` or migration error | read the backend container logs; the entrypoint runs migrations before starting |
| Storefront exits with `Missing required storefront environment variables` | `MEDUSA_BACKEND_URL` or `MEDUSA_PUBLISHABLE_KEY` missing | set both on the storefront application |
| Storefront returns `Region not found` | publishable key is not linked to the sales channel, or the country is not in a region | check the tenant database and the region settings |
| Checkout does not offer Paystack | provider is not enabled on the region, or settlement is not configured | add the Paystack Gateway provider in the region and save a settlement account |
| Paystack webhooks are stored but not forwarded | gateway worker is not running | start `dist/worker.js` |
| Plan payment succeeds but no store is provisioned | gateway has no `DASHBOARD_URL` or `ORDER_WEBHOOK_SECRET`, or the order `provider_reference` does not match the payment reference | set both variables on the gateway, check the order reference, and look for `order.paid` in the dashboard audit log |
| Bank resolve fails in test mode | Paystack test daily limit | use bank code `001`, wait for the limit to reset, or use a live key |
| `TENANT_CONFIG` is rejected | missing or invalid field | compare with `packages/tenant-config/src/index.ts`; the dashboard shows the zod error |

Useful log commands:

```bash
docker logs --tail 100 flowcheq-dashboard
docker logs --tail 100 flowcheq-worker
docker logs --tail 100 flowcheq-gateway
docker logs --tail 100 flowcheq-gateway-worker
```

## Security notes

- The Paystack master secret belongs only in `packages/payments-gateway/.env`. Tenant backends hold a per-vendor token and webhook secret.
- Keep `SECRETS_ENCRYPTION_KEY` stable and backed up. Rotating it makes existing `tenant_secrets` rows unreadable.
- Rotating `WEBHOOK_SIGNING_ROOT` invalidates every vendor's webhook signing secret.
- Keep `ADMIN_TOKEN` and `PAYMENTS_GATEWAY_ADMIN_TOKEN` identical and secret. They can register and modify vendors.
- Treat `RELEASE_WEBHOOK_SECRET` and `ORDER_WEBHOOK_SECRET` as secrets. They authorize the internal release and order endpoints; rotate them in the dashboard and the gateway together.
- Serve the dashboard and gateway over HTTPS. The dashboard session cookie is `httpOnly` and `SameSite=Lax`; TLS protects it in transit.
- Keep Postgres and Redis on private networks. The tenant admin database role can create roles and databases.
- Never commit `.env` files or print secret values in logs.
- Back up the control-plane database, the gateway database and every tenant database.

## Current scope

The following parts are implemented and covered by this guide:

- control-plane database, dashboard, provisioning worker and audit log
- Coolify-based tenant provisioning with resumable steps
- idempotent tenant backend bootstrap
- runtime-configured storefront
- central Paystack gateway with vendor tokens, bank resolution, settlement and webhook forwarding
- staff order management: create and list plan orders, mark them paid and queue provisioning
- automatic provisioning after payment: the gateway calls the dashboard on `charge.success`, marks the matching order paid and queues the store deployment
- staff management of existing tenants: retry, redeploy, suspend, resume and deprovision

The following are not automated yet:

- public customer signup and plan checkout; the landing page, unauthenticated order-creation endpoint and hosted-checkout redirect are still to be built, so staff create the order record today
- DNS record creation; the `dns` provisioning step is a placeholder, so create the wildcard record manually
- control-plane email (customer and provisioning notices); only tenant Brevo email is implemented
- automatic release-ring rollout; rings are recorded but tenants are redeployed individually
- gateway image in the release workflow; build and push it manually as shown in Step 2

## Local development

For working on the code rather than deploying it:

```bash
npm ci
```

Backend:

```bash
cp apps/backend/.env.template apps/backend/.env
# set DATABASE_URL, JWT_SECRET, COOKIE_SECRET, TENANT_CONFIG
npm run backend:dev
# http://localhost:9000, admin at /app
```

Storefront:

```bash
cp apps/storefront/.env.template apps/storefront/.env.local
# set MEDUSA_PUBLISHABLE_KEY from the backend
npm run storefront:dev
# http://localhost:8000
```

Dashboard:

```bash
cp .env.example .env
# fill CONTROL_PLANE_DATABASE_URL, REDIS_URL, SECRETS_ENCRYPTION_KEY
npm run build --workspace=@flowcheq/db
npm run migrate --workspace=@flowcheq/db
npm run dev --workspace=@dtc/dashboard
# http://localhost:3000
```

Worker:

```bash
npm run build --workspace=@dtc/worker
node --env-file=.env apps/worker/dist/main.js
```

Gateway:

```bash
cd packages/payments-gateway
cp .env.example .env
set -a; . ./.env; set +a
npm run migrate:dev
npm run dev
# API on http://localhost:8080
npm run dev:worker
# in a second terminal, with the same exported environment
```

Tests:

```bash
npm run test
```

## Manual single-tenant deployment

This path is for deploying one store without the control plane or Coolify. It is also useful for local integration testing.

### 1. Create the database

Create a role and database matching the tenant slug. For slug `acme`:

```sql
create role t_acme login password 'replace-me' connection limit 10;
create database t_acme owner t_acme;
```

### 2. Run the backend

```bash
docker run -d --name acme-backend \
  -p 9000:9000 \
  -e NODE_ENV=production \
  -e DATABASE_URL='postgres://t_acme:replace-me@db.example.com:5432/t_acme' \
  -e JWT_SECRET='replace-with-openssl-rand-hex-32' \
  -e COOKIE_SECRET='replace-with-openssl-rand-hex-32' \
  -e STORE_CORS='https://acme.example.store' \
  -e ADMIN_CORS='https://admin-acme.example.store' \
  -e AUTH_CORS='https://acme.example.store,https://admin-acme.example.store' \
  -e MEDUSA_ADMIN_BACKEND_URL='https://admin-acme.example.store' \
  -e STOREFRONT_URL='https://acme.example.store' \
  -e TENANT_CONFIG='{"slug":"acme","businessName":"Acme","ownerEmail":"owner@acme.test","plan":"starter","currency":"NGN","region":"ng","brand":{"primaryColor":"#111111"}}' \
  -e GATEWAY_URL='https://gateway.example.com' \
  -e GATEWAY_TOKEN='replace-with-vendor-token' \
  -e GATEWAY_WEBHOOK_SECRET='replace-with-vendor-webhook-secret' \
  ghcr.io/acme/flowcheq-commerce/backend:latest
```

The container runs migrations and the idempotent bootstrap before starting. Wait for:

```bash
curl -fsS http://localhost:9000/health
```

Read the storefront publishable key from the tenant database:

```bash
psql "postgres://t_acme:replace-me@db.example.com:5432/t_acme" -c \
  "select token from api_key
   where type = 'publishable'
     and title = 'storefront'
     and deleted_at is null
     and revoked_at is null
   order by created_at asc
   limit 1;"
```

### 3. Run the storefront

```bash
docker run -d --name acme-storefront \
  -p 3000:3000 \
  -e MEDUSA_BACKEND_URL='https://admin-acme.example.store' \
  -e MEDUSA_PUBLISHABLE_KEY='pk_replace-me' \
  -e STORE_NAME='Acme' \
  -e BRAND_PRIMARY_COLOR='#111111' \
  -e STORE_DEFAULT_REGION='ng' \
  -e STORE_BASE_URL='https://acme.example.store' \
  ghcr.io/acme/flowcheq-commerce/storefront:latest
```

`MEDUSA_BACKEND_URL` is the backend's public URL, which is the `admin-` hostname in the standard layout. Do not point it at the storefront hostname.

Wait for:

```bash
curl -fsS http://localhost:3000/health
```

### 4. Finish setup

- Put both hosts behind TLS.
- Retrieve the owner invite from the tenant database and send the `/app/invite?token=...` link.
- Register the vendor in the gateway and restart the backend with the returned token and webhook secret.
- Enable the Paystack Gateway provider on the region and save a settlement account in **Admin > Payments**.

## License and ownership

Flowcheq Commerce is privately owned. The source in this repository is not published as an open-source starter. Medusa and the other third-party dependencies keep their own licenses; review them before distributing the platform.
