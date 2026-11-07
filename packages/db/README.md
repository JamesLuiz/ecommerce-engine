# @flowcheq/db

Drizzle ORM schema, database client and secret-encryption helpers for the
Flowcheq control plane.

## Contents

- `src/schema.ts` - customers, sessions, plans, orders, tenants, tenant_secrets,
  provision_steps, releases and audit_log.
- `src/encryption.ts` - AES-256-GCM `encrypt`/`decrypt` for tenant secrets,
  keyed by `SECRETS_ENCRYPTION_KEY` (64 hex characters).
- `src/index.ts` - the shared `db` client (`CONTROL_PLANE_DATABASE_URL`).

## Scripts

```bash
npm run build    --workspace=@flowcheq/db
npm run test     --workspace=@flowcheq/db
npm run lint     --workspace=@flowcheq/db
npm run generate --workspace=@flowcheq/db   # create a migration from schema.ts
npm run migrate  --workspace=@flowcheq/db   # apply migrations
```

`generate` and `migrate` use `drizzle-kit`, which npm hoists to the repository
root. `drizzle-orm` is therefore also declared as a root devDependency so the
CLI can resolve it from there. Keep the `drizzle-orm` version aligned across the
root and the workspace that owns the schema; drizzle-kit 0.31.x requires the
ORM API version 10 (drizzle-orm 0.44.x).

Migrations live in `drizzle/` and must be committed. Add a new migration for
schema changes instead of editing one that may already have run.
