# Flowcheq Commerce control-plane dashboard

Next.js (App Router) staff console for Flowcheq Commerce.

## What it does

- Staff authentication (email + password, argon2id, server-side session cookie).
- Tenant list and detail: provisioning steps, logs, URLs, Coolify app ids.
- Deployment actions: retry failed steps, redeploy, suspend, resume, deprovision
  (deprovision requires typing the tenant slug and queues a worker job).
- Provisioning jobs: live BullMQ counts and failed jobs with reasons.
- Releases registered by the release workflow, with a ring marker and audit log.
- Audit trail for staff actions, release registrations and worker cleanup.
- `POST /api/internal/releases` for CI (Bearer `RELEASE_WEBHOOK_SECRET`).

Actions are queued on the `provision` queue and run by `apps/worker`. If the
worker or Redis is down, the action returns an error and the tenant is left
untouched.

## Step 1: Deploy the dashboard

### 1.1 Prerequisites

- Linux server for the control plane (dashboard, provisioning worker and payments
  gateway) with Docker 24+ and Docker Compose v2.
- PostgreSQL 15+ and Redis 7+ reachable from the server.
- Node.js 22.23.4 or newer and npm 11.19.1 for local builds (the image uses Node 22).

### 1.2 Configure the environment

```bash
cp .env.example .env
```

Minimum runtime variables for the dashboard:

```bash
CONTROL_PLANE_DATABASE_URL=postgres://flowcheq_control:replace-me@db.example.com:5432/flowcheq_control
REDIS_URL=redis://:password@redis.example.com:6379/0
SECRETS_ENCRYPTION_KEY=replace-with-64-hex-characters
RELEASE_WEBHOOK_SECRET=replace-with-openssl-rand-hex-32
ORDER_WEBHOOK_SECRET=replace-with-openssl-rand-hex-32
```

The provisioning actions also read the tenant deployment settings from the same
file: `STORE_BASE_DOMAIN`, `BACKEND_IMAGE`, `STOREFRONT_IMAGE`, `TENANT_PG_ADMIN_URL`,
`TENANT_PG_HOST`, `TENANT_PG_PORT`, `TENANT_REDIS_URL`, `COOLIFY_URL`,
`COOLIFY_TOKEN`, `COOLIFY_PROJECT_UUID`, `COOLIFY_SERVER_UUID`,
`COOLIFY_ENVIRONMENT_NAME`, `GATEWAY_URL` and `PAYMENTS_GATEWAY_ADMIN_TOKEN`.

`SECRETS_ENCRYPTION_KEY` must be exactly 64 hex characters (32 bytes) and must not
change after the first tenant is provisioned.

Tenant email is optional: when `BREVO_API_KEY` is set, the provisioner passes
`BREVO_API_KEY`, `BREVO_FROM_EMAIL` and `BREVO_FROM_NAME` into every tenant
backend.

### 1.3 Build the image

From the repository root:

```bash
docker build -f infra/docker/dashboard.Dockerfile \
  -t ghcr.io/acme/flowcheq-commerce/dashboard:latest .
```

### 1.4 Run the container

```bash
docker run -d --name flowcheq-dashboard \
  --env-file .env \
  -p 9000:9000 \
  ghcr.io/acme/flowcheq-commerce/dashboard:latest
```

The dashboard container listens on port 9000. Local `npm run dev` uses port 3000;
production images always use 9000.

### 1.5 Verify the deployment

```bash
curl -fsS http://localhost:9000/api/health
# {"status":"ok"}
```

```bash
docker logs --tail 50 flowcheq-dashboard
```

### 1.6 Create a staff account and log in

```bash
docker exec -it -e STAFF_PASSWORD='at-least-12-chars' flowcheq-dashboard \
  npm run staff:create -- --email you@example.com --name "Your Name"
```

Log in at `https://dashboard.example.com/login`. Requests to `/admin` without a
staff session are redirected to `/login`, and accounts whose role is not `staff`
are rejected.

## Step 2: Automatically deploy a store after the customer has paid

### 2.1 Payment success

A customer pays the plan fee through the tenant-facing checkout. The Paystack flow
ends with a `charge.success` event:

1. The tenant backend creates a Paystack payment session through the central
   payments gateway (`POST /v1/transactions/initialize`).
2. Paystack sends `charge.success` to the gateway webhook (`POST
   /webhooks/paystack`).
3. The gateway marks the transaction as successful, forwards the event to the
   vendor webhook URL registered during provisioning, and calls the dashboard
   internal order endpoint (`POST /api/internal/orders/by-reference/<reference>/paid`)
   with `ORDER_WEBHOOK_SECRET`.
4. The dashboard marks the matching plan order paid, creates or reuses the tenant
   from the order `signup_payload` and queues provisioning.
5. The tenant backend payment provider maps the gateway event back to the Medusa
   payment session and captures the order.

On the billing side, the control-plane order therefore transitions from
`pending` to `paid`, records the payment time and starts the store deployment.

### 2.2 Trigger the provisioning job

When the order is marked as paid, the dashboard:

1. Loads the order by id or by provider reference.
2. Sets the order status to `paid` and records `paid_at` (idempotently; a paid
   order is left untouched).
3. Creates or reuses the tenant for the customer, using the tenant configuration
   stored in the order `signup_payload` and validated by `@flowcheq/tenant-config`.
4. Queues the provisioning job for that tenant:

```ts
await enqueueProvision(tenantId)
```

`enqueueProvision` is exported from the dashboard queue module and adds a job
with the deterministic id `provision:<tenantId>` on the `provision` queue, so
retries and duplicate payment events never create parallel runs.

### 2.3 Let the worker deploy the store

The worker consumes the `provision` queue and runs the provisioning steps in
order:

`validate` -> `secrets` -> `database` -> `backend_app` -> `storefront_app` -> `dns` -> `deploy_backend` -> `read_bootstrap` -> `deploy_storefront` -> `finalize`.

The run ends with the tenant marked as `active` and the storefront publishable key
read from the tenant database.

Payment-to-provisioning is wired end to end. The gateway notifies the control
plane on `charge.success`; staff can also trigger it from the **Orders** page
(**Mark paid and deploy**) or with
`POST /api/admin/orders/[id]/actions` and `{"action":"mark_paid"}`. The full
tenant action set (`retry`, `redeploy`, `suspend`, `resume`, `deprovision`)
remains available on each tenant page.

### 2.4 Payment success hook

The dashboard exposes two internal endpoints that share the same idempotent
`markOrderPaid` logic:

- `POST /api/internal/orders/:id/paid` marks a known order id paid.
- `POST /api/internal/orders/by-reference/:reference/paid` resolves the order by
  `provider_reference`. An unknown reference returns
  `{"ok":true,"ignored":true}` so tenant checkout transactions that also pass
  through the gateway webhook are no-ops.

Both use the bearer token `ORDER_WEBHOOK_SECRET` and:

- mark the order paid and record `paid_at`
- reuse the tenant for the order customer and signup slug, or create it
- enqueue the `provision` job for that tenant
- return `{"ok":true,"orderId","tenantId","jobId"}`; an order that is already
  `paid` returns `{"alreadyPaid":true}` without re-enqueueing

The gateway calls the by-reference endpoint when `DASHBOARD_URL` and
`ORDER_WEBHOOK_SECRET` are set in `packages/payments-gateway/.env`.

## Step 3: Tenant signup landing page, plan payment and order-triggered deployment

### 3.1 Landing page

The tenant-facing landing page collects the personal and business details needed
to provision a store:

- `slug`: 3 to 32 characters, lowercase, letters/digits/hyphens; reserved slugs
  such as `admin`, `api` and `dashboard` are rejected.
- `businessName`, `ownerEmail`.
- `plan`, for example `starter`.
- `currency`, for example `NGN`, and `region`.
- `brand.primaryColor`.
- `features`, for example whether the tenant uses the built-in Paystack gateway.

The submitted payload is validated with the shared `@flowcheq/tenant-config` schema
before it enters the provisioning pipeline.

### 3.2 Collect the plan payment

The plan fee is collected with Paystack from the landing page:

1. Initialize the Paystack transaction through the central gateway
   (`POST /v1/transactions/initialize`) and keep the returned gateway reference
   and authorization URL.
2. Create the control-plane order with the plan amount in minor units (for the
   `starter` plan priced at 150000 in the `NGN` currency, `amount_minor` is
   15000000), the provider (`paystack`), the gateway reference as
   `provider_reference`, status `pending` and the tenant configuration as
   `signup_payload`. Today this is done from **Orders > Create order** or
   `POST /api/admin/orders`.
3. Send the customer to the Paystack authorization URL.
4. On `charge.success` the gateway forwards the event to the tenant backend and
   calls the dashboard; the order becomes paid, the tenant is created and
   provisioning is queued.

A public, unauthenticated signup endpoint that performs steps 1-3 from the
landing page is not implemented yet.

### 3.3 Queue the deployment per order

Each paid order triggers its own store deployment: `markOrderPaid` creates the
tenant from the order `signup_payload` and enqueues `provision:<tenantId>`.
The deterministic job id means a retried or duplicated payment event maps to the
same provisioning run.

## Step 4: Manage orders through the dashboard to create the tenant store

The staff dashboard is the control plane entry point for order-driven store
creation. Open **Orders** (`/admin/orders`):

- the table lists the newest 500 orders with customer, store slug, plan,
  reference, amount, status and paid time;
- **Create order** takes customer, plan, amount, currency, status, region,
  business name, slug and provider reference, builds the `signup_payload` from
  those fields and validates it with `@flowcheq/tenant-config`;
- choosing `paid` in the form inserts the order and immediately runs the paid
  path, so the tenant is created and provisioning is queued;
- pending or failed orders have a **Mark paid and deploy** action, which runs the
  same path after a payment confirmed outside the webhook;
- the store itself is then managed from **Tenants** (steps, retry, redeploy,
  suspend, resume, deprovision).

## Orders API

Staff endpoints, authenticated by the staff session cookie:

- `GET /api/admin/orders?status=<pending|paid|failed>&limit=<n>` lists orders,
  joined with the customer email and name, newest first. `status` is optional and
  `limit` defaults to 500 (max 500).
- `POST /api/admin/orders` creates an order:

```json
{
  "customer_id": "uuid",
  "plan_id": "starter",
  "provider": "paystack",
  "provider_reference": "gateway-transaction-reference",
  "amount_minor": 15000000,
  "currency": "NGN",
  "status": "pending",
  "signup_payload": {
    "slug": "acme",
    "businessName": "Acme",
    "ownerEmail": "owner@acme.test",
    "plan": "starter",
    "currency": "NGN",
    "region": "ng"
  }
}
```

The body is validated with zod, the customer and plan must exist, and
`signup_payload` must satisfy `@flowcheq/tenant-config`. The insert is audited as
`order.created`. A `paid` body is inserted as `pending` and then run through the
paid path, so the response includes the tenant id and provisioning job id.

- `POST /api/admin/orders/[id]/actions` with `{"action":"mark_paid"}` marks a
  pending order paid and queues provisioning. Audited as `order.paid` with the
  staff email as actor.

Internal endpoints, authenticated with `Authorization: Bearer
$ORDER_WEBHOOK_SECRET`:

- `POST /api/internal/orders/[id]/paid`
- `POST /api/internal/orders/by-reference/[reference]/paid` (what the gateway
  calls; unknown references are ignored)

Both return `{"ok":true,"orderId","tenantId","jobId"}` and are idempotent.

## Run

```bash
npm run dev   --workspace=@dtc/dashboard     # http://localhost:9000
npm run build --workspace=@dtc/dashboard
npm run start --workspace=@dtc/dashboard
npm run lint  --workspace=@dtc/dashboard
```

The app reads the env vars documented in the repository `.env.example`.
Required at runtime: `CONTROL_PLANE_DATABASE_URL`, `REDIS_URL`,
`SECRETS_ENCRYPTION_KEY` (for tenant secrets), `RELEASE_WEBHOOK_SECRET` and
`ORDER_WEBHOOK_SECRET` (internal endpoints). The provisioning settings in the
same file are required to queue and run deployments.

## Create a staff account

Staff accounts live in the `customers` table with `role = 'staff'`. Create or
promote one with:

```bash
npm run staff:create --workspace=@dtc/dashboard -- --email you@example.com
# Password is prompted. For automation:
STAFF_PASSWORD='at-least-12-chars' npm run staff:create --workspace=@dtc/dashboard -- --email you@example.com --name "Your Name"
```

The script hashes the password with argon2id and never logs it.

## Auth model

`middleware.ts` redirects requests to `/admin` that have no session cookie. Every
admin page and API route then verifies the session in the database and rejects
accounts whose role is not `staff`, so a customer session cannot reach the staff
area.
