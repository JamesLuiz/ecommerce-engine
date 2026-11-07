# Flowcheq Commerce control-plane dashboard

Next.js (App Router) staff console for Flowcheq Commerce.

## What it does

- Staff authentication (email + password, argon2id, server-side session cookie).
- Tenant list and detail: provisioning steps, logs, URLs, Coolify app ids.
- Deployment actions: retry failed steps, redeploy, suspend/resume, deprovision
  (deprovision requires typing the tenant slug and queues a worker job).
- Provisioning jobs: live BullMQ counts and failed jobs with reasons.
- Releases registered by the release workflow, with a ring marker and audit log.
- Audit trail for staff actions, release registrations and worker cleanup.
- `POST /api/internal/releases` for CI (Bearer `RELEASE_WEBHOOK_SECRET`).

Actions are queued on the `provision` queue and run by `apps/worker`. If the
worker or Redis is down, the action returns an error and the tenant is left
untouched.

## Run

```bash
npm run dev   --workspace=@dtc/dashboard     # http://localhost:9000
npm run build --workspace=@dtc/dashboard
npm run start --workspace=@dtc/dashboard
npm run lint  --workspace=@dtc/dashboard
```

The app reads the env vars documented in the repository `.env.example`.
Required at runtime: `CONTROL_PLANE_DATABASE_URL`, `REDIS_URL`,
`SECRETS_ENCRYPTION_KEY` (for tenant secrets), `RELEASE_WEBHOOK_SECRET`
(internal endpoint) and `APP_URL`.

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
