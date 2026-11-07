# syntax=docker/dockerfile:1.7
#
# One image for every tenant. Branding, backend URL and publishable key are read
# at request time from the environment (see src/lib/runtime-config.ts), never
# baked in at build time.

FROM node:22-bookworm-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
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
RUN npm run build --workspace=@flowcheq/tenant-config
COPY apps/storefront apps/storefront
RUN npm run build --workspace=@dtc/storefront

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

WORKDIR /app

COPY --chown=nextjs:nodejs --from=builder /app/apps/storefront/.next ./.next
COPY --chown=nextjs:nodejs --from=builder /app/apps/storefront/public ./public
COPY --chown=nextjs:nodejs --from=builder /app/apps/storefront/package.json ./package.json
COPY --chown=nextjs:nodejs --from=builder /app/apps/storefront/next.config.js ./next.config.js
COPY --chown=nextjs:nodejs --from=builder /app/node_modules ./node_modules

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["./node_modules/.bin/next", "start"]
