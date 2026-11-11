import { logger } from "../logger.js"
import { reconcileQueue } from "./queue.js"

const RECONCILE_INTERVAL_MS = 5 * 60 * 1000
const RECONCILE_JOB_ID = "reconcile-every-5-min"

export const scheduleReconciliation = async (): Promise<void> => {
  try {
    await reconcileQueue.upsertJobScheduler(
      RECONCILE_JOB_ID,
      { every: RECONCILE_INTERVAL_MS },
      {
        name: "reconcile",
        data: {},
        opts: { removeOnComplete: true, removeOnFail: true },
      },
    )
  } catch (error) {
    logger.error({ error }, "failed to schedule the reconciliation job")
  }
}
