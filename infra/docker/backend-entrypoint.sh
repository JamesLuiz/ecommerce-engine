#!/bin/sh
set -e

# Migrations are idempotent, so running them on every boot is safe and lets a
# rollout apply schema changes without remote command execution.
npx --no-install medusa db:migrate

# Idempotent per-tenant data: store name, region, sales channel, publishable
# key and the owner's admin invite. Retries after a failed provisioning run
# converge instead of duplicating data.
npx --no-install medusa exec ./src/scripts/bootstrap-tenant.js

exec npm run start
