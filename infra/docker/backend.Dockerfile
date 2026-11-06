# syntax=docker/dockerfile:1.7
#
# One image for every tenant. All tenant-specific values (database URL, CORS,
# tenant config, secrets) are environment variables supplied at container start.

FROM node:22-bookworm-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/storefront/package.json apps/storefront/package.json
COPY packages/tenant-config packages/tenant-config
RUN npm ci

FROM deps AS builder
COPY packages/tenant-config packages/tenant-config
RUN npm run build --workspace=@flowcheq/tenant-config
COPY apps/backend apps/backend
RUN npm run build --workspace=@dtc/backend

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=9000

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs medusa

WORKDIR /app

# The Medusa build output is a self-contained app: it has its own package.json,
# compiled src/, admin assets and medusa-config.js.
COPY --chown=medusa:nodejs --from=builder /app/apps/backend/.medusa/server ./
COPY --chown=medusa:nodejs --from=builder /app/node_modules ./node_modules
COPY --chown=medusa:nodejs --from=builder /app/packages/tenant-config ./packages/tenant-config
COPY --chown=medusa:nodejs infra/docker/backend-entrypoint.sh ./backend-entrypoint.sh

RUN chmod +x ./backend-entrypoint.sh

USER medusa
EXPOSE 9000

HEALTHCHECK --interval=30s --timeout=5s --start-period=120s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 9000) + '/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

ENTRYPOINT ["./backend-entrypoint.sh"]
