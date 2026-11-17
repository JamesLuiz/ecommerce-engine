# syntax=docker/dockerfile:1.7
#
# Central Flowcheq payments gateway. Talks to Paystack on behalf of every
# per-vendor Medusa instance and owns settlement state.
#
# The build context must be the repository root:
#   docker build -f infra/docker/gateway.Dockerfile -t flowcheq/payments-gateway .
#
# The same image runs three entrypoints:
#   gateway-entrypoint          default: migrate, then API + worker in one
#                               container (the Coolify deployment shape)
#   node dist/index.js          HTTP API only
#   node dist/worker.js         BullMQ workers (webhook forwarding, reconciliation)
#   node dist/migrate.js        one-shot database migrations
# Any argument is exec'd as `node <args>`, so docker compose can still run
# the three processes as separate services.

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
COPY packages/payments-gateway/package.json packages/payments-gateway/package.json
RUN npm ci --ignore-scripts --no-audit --no-fund

FROM deps AS builder
COPY packages/payments-gateway packages/payments-gateway
RUN npm run build --workspace=@flowcheq/payments-gateway \
  && npm prune --omit=dev --no-audit --no-fund

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=8080

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs gateway \
  && apt-get update \
  && apt-get install -y --no-install-recommends curl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --chown=gateway:nodejs --from=builder /app/node_modules ./node_modules
COPY --chown=gateway:nodejs --from=builder /app/packages/payments-gateway/dist ./dist
COPY --chown=gateway:nodejs --from=builder /app/packages/payments-gateway/migrations ./migrations
COPY --chown=gateway:nodejs --from=builder /app/packages/payments-gateway/package.json ./package.json

USER gateway
COPY --chmod=755 infra/docker/gateway-entrypoint /usr/local/bin/gateway-entrypoint

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 8080) + '/healthz').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

ENTRYPOINT ["/usr/local/bin/gateway-entrypoint"]
CMD []
