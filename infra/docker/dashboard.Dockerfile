# syntax=docker/dockerfile:1.7
#
# Staff control-plane dashboard: tenant management, jobs, releases and audit.

FROM node:22-bookworm-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
# Frozen admin rebrand patches; applied by patch-package in the postinstall
# script. Must be present before `npm ci` runs.
COPY patches patches
COPY apps/backend/package.json apps/backend/package.json
COPY apps/storefront/package.json apps/storefront/package.json
COPY apps/dashboard/package.json apps/dashboard/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY packages/tenant-config/package.json packages/tenant-config/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/provisioner/package.json packages/provisioner/package.json
RUN npm ci

FROM deps AS builder
COPY packages/tenant-config packages/tenant-config
COPY packages/db packages/db
RUN npm run build --workspace=@flowcheq/db
COPY apps/dashboard apps/dashboard
RUN npm run build --workspace=@dtc/dashboard

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=9000

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

WORKDIR /app

COPY --chown=nextjs:nodejs --from=builder /app/node_modules ./node_modules
COPY --chown=nextjs:nodejs --from=builder /app/package.json ./package.json
COPY --chown=nextjs:nodejs --from=builder /app/packages/db ./packages/db
COPY --chown=nextjs:nodejs --from=builder /app/apps/dashboard/.next ./apps/dashboard/.next
COPY --chown=nextjs:nodejs --from=builder /app/apps/dashboard/package.json ./apps/dashboard/package.json
COPY --chown=nextjs:nodejs --from=builder /app/apps/dashboard/next.config.js ./apps/dashboard/next.config.js

WORKDIR /app/apps/dashboard
USER nextjs
EXPOSE 9000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 9000) + '/api/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["/app/node_modules/.bin/next", "start", "-p", "9000"]
