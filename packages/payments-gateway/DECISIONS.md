# Payments Gateway — decisions

## Placement

The gateway is implemented as the npm-workspace package `@flowcheq/payments-gateway`
at `packages/payments-gateway/` instead of a standalone repository, because this
repository mandates a single lockfile and npm workspaces. The service source layout
mirrors the specification under `src/`.

## Choices made for ambiguous points

1. **Postgres client**: `postgres` (porsager) with raw SQL migrations. No ORM.
2. **Zod**: the workspace version (zod v4) is used for the environment schema and payload validation.
3. **Provider selection**: the gateway always creates/updates a Paystack subaccount with
   `percentage_charge: 0` and sends `bearer: "subaccount"`; the vendor Medusa instance can
   never override it.
4. **Webhook forward**: BullMQ queue `gateway-webhook-forward`, single Paystack webhook URL
   at `/webhooks/paystack`. Retries with exponential backoff; dedupe on sha256 of raw body.
5. **Refund**: behind the `REFUNDS_ENABLED` flag (default `false`).
6. **Reconciliation**: a repeatable BullMQ worker (`gateway-reconcile-transactions`, every
   5 minutes) verifies stale pending transactions and abandons ones older than 24 hours.
7. **Partial updates**: `updateTransaction` only writes the columns present in the patch, so
   webhook updates never wipe captured fees or amounts.

## Out of scope (until confirmed with Paystack)

See section 14 of the architecture brief: refund funding, settlement schedule, dispute
liability details, subaccount count limits.
