# syntax=docker/dockerfile:1.7
#
# Central Flowcheq payments gateway. Talks to Paystack on behalf of every
# per-vendor Medusa instance and owns settlement state.

FROM node:22-bookworm-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
COPY packages/payments-gateway/package.json packages/payments-gateway/package.json
RUN npm ci

FROM deps AS builder
COPY packages/payments-gateway packages/payments-gateway
RUN npm run build --workspace=@flowcheq/payments-gateway

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=8080

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs gateway

WORKDIR /app

COPY --chown=gateway:nodejs --from=builder /app/packages/payments-gateway/dist ./dist
COPY --chown=gateway:nodejs --from=builder /app/node_modules ./node_modules
COPY --chown=gateway:nodejs --from=builder /app/packages/payments-gateway/package.json ./package.json

USER gateway
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 8080) + '/healthz').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

ENTRYPOINT ["node", "dist/index.js"]
