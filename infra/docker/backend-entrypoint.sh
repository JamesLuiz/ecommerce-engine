#!/bin/sh
set -e

# Migrations are idempotent, so running them on every boot is safe and lets a
# rollout apply schema changes without remote command execution.
npx --no-install medusa db:migrate

# Idempotent per-tenant data: store name, region, sales channel, publishable
# key and the owner's admin invite. Retries after a failed provisioning run
# converge instead of duplicating data.
npx --no-install medusa exec ./src/scripts/bootstrap-tenant.js

# Keep the gateway vendor's webhook URL and allowed callback origins in sync
# with this tenant's environment. A gateway outage must not block store startup.
if [ -n "${PAYMENTS_GATEWAY_ADMIN_TOKEN:-}" ] || [ -n "${GATEWAY_ADMIN_TOKEN:-}" ] || [ -n "${ADMIN_TOKEN:-}" ]; then
  if ! npx --no-install medusa exec ./src/scripts/ensure-gateway-vendor.js; then
    echo "warning: could not refresh Paystack gateway vendor registration"
  fi
fi

exec npm run start
