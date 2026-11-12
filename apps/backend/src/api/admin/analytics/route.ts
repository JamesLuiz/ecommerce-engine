import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"
import { getOrdersListWorkflow } from "@medusajs/core-flows"

import {
  buildAnalytics,
  resolveAnalyticsWindow,
  type AnalyticsOrder,
  type AnalyticsRange,
  type StockItemInput,
} from "../../../lib/analytics"

const querySchema = z.object({
  range: z.enum(["7d", "30d", "90d", "12m", "all"]).default("30d"),
  granularity: z.enum(["day", "week", "month"]).optional(),
})

const ORDER_PAGE_SIZE = 500
const MAX_ORDERS = 20000
const STOCK_PAGE_SIZE = 500
const MAX_STOCK_ITEMS = 20000
const LOW_STOCK_THRESHOLD = 5

/**
 * Admin analytics summary.
 *
 * Reads orders through the order module (so `total` is computed by Medusa) and
 * inventory levels through the query graph (so `stocked_quantity` is the
 * aggregated SQL formula). No writes, no raw SQL.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const parsed = querySchema.safeParse(req.query ?? {})

  if (!parsed.success) {
    res.status(400).json({
      type: "invalid_data",
      message: "Invalid analytics query",
      errors: parsed.error.issues.map((issue) => ({
        path: issue.path,
        message: issue.message,
      })),
    })
    return
  }

  const range: AnalyticsRange = parsed.data.range
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const window = resolveAnalyticsWindow(range, parsed.data.granularity)

  const filters = {
    is_draft_order: false,
    status: { $ne: "canceled" },
    created_at: window.from ? { $gte: window.from, $lte: window.to } : { $lte: window.to },
  }

  const orders: AnalyticsOrder[] = []
  let truncated = false
  let skip = 0

  while (true) {
    const { result } = await getOrdersListWorkflow(req.scope).run({
      input: {
        fields: ["id", "created_at", "status", "currency_code", "total"],
        variables: { filters, skip, take: ORDER_PAGE_SIZE },
      },
    })

    const page: AnalyticsOrder[] =
      ((result as { rows?: AnalyticsOrder[] })?.rows ??
        (result as AnalyticsOrder[])) as AnalyticsOrder[]

    orders.push(...page)

    if (page.length < ORDER_PAGE_SIZE) {
      break
    }

    skip += ORDER_PAGE_SIZE

    if (orders.length >= MAX_ORDERS) {
      truncated = true
      break
    }
  }

  const stockItems: StockItemInput[] = []
  skip = 0

  while (true) {
    const result = await query.graph({
      entity: "inventory_item",
      fields: [
        "id",
        "sku",
        "stocked_quantity",
        "reserved_quantity",
        "variants.title",
        "variants.product.title",
      ],
      pagination: { take: STOCK_PAGE_SIZE, skip },
    })

    const page = (result.data ?? []) as unknown as StockItemInput[]
    stockItems.push(...page)

    if (page.length < STOCK_PAGE_SIZE) {
      break
    }

    skip += STOCK_PAGE_SIZE

    if (stockItems.length >= MAX_STOCK_ITEMS) {
      truncated = true
      break
    }
  }

  let fallbackCurrency = "usd"

  try {
    const storeResult = (await query.graph({
      entity: "store",
      fields: ["id", "supported_currencies.currency_code"],
    })) as {
      data?: Array<{
        supported_currencies?: Array<{ currency_code?: string | null }> | null
      }>
    }
    const currency =
      storeResult.data?.[0]?.supported_currencies?.[0]?.currency_code
    fallbackCurrency = currency ?? fallbackCurrency
  } catch {
    // A store without configured currencies still gets a usable dashboard.
  }

  const analytics = buildAnalytics({
    orders,
    stockItems,
    from: window.from,
    to: window.to,
    granularity: window.granularity,
    lowStockThreshold: LOW_STOCK_THRESHOLD,
    fallbackCurrency,
  })

  res.json({
    range: {
      preset: range,
      from: analytics.effectiveFrom,
      to: window.to.toISOString(),
      granularity: window.granularity,
    },
    ...analytics,
    truncated,
  })
}
