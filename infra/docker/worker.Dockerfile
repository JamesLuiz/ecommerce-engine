# syntax=docker/dockerfile:1.7
#
# BullMQ worker that runs tenant provisioning and deprovisioning jobs.

FROM node:22-bookworm-slim AS base
ENV NODE_ENV=production
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
COPY packages/provisioner packages/provisioner
COPY apps/worker apps/worker
RUN npm run build --workspace=@flowcheq/tenant-config \
  && npm run build --workspace=@flowcheq/db \
  && npm run build --workspace=@flowcheq/provisioner \
  && npm run build --workspace=@dtc/worker

FROM base AS runner
RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs worker

WORKDIR /app

COPY --chown=worker:nodejs --from=builder /app/node_modules ./node_modules
COPY --chown=worker:nodejs --from=builder /app/package.json ./package.json
COPY --chown=worker:nodejs --from=builder /app/packages ./packages
COPY --chown=worker:nodejs --from=builder /app/apps/worker ./apps/worker

USER worker

CMD ["node", "apps/worker/dist/main.js"]
