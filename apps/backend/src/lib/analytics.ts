/**
 * Pure analytics aggregation helpers.
 *
 * Kept free of framework imports so the dashboard route, the admin UI and the
 * unit tests all share exactly the same bucketing/revenue logic.
 */

export type AnalyticsRange = "7d" | "30d" | "90d" | "12m" | "all"

export type AnalyticsGranularity = "day" | "week" | "month"

export type AnalyticsOrderItem = {
  title?: string | null
  product_id?: string | null
  variant_id?: string | null
  quantity?: number | string | null
  unit_price?: number | string | null
  subtotal?: number | string | null
  total?: number | string | null
}

export type AnalyticsOrder = {
  id: string
  created_at: string | Date
  total?: number | string | null
  currency_code?: string | null
  items?: AnalyticsOrderItem[] | null
}

export type StockItemInput = {
  id: string
  sku?: string | null
  stocked_quantity?: number | string | null
  reserved_quantity?: number | string | null
  variants?: Array<{
    title?: string | null
    product?: { title?: string | null } | null
  }> | null
}

export type AnalyticsBucket = {
  key: string
  label: string
  revenue: number
  orders: number
  units: number
}

export type TopProduct = {
  id: string
  title: string
  quantity: number
  revenue: number
}

export type LowStockItem = {
  id: string
  sku: string
  title: string
  stocked: number
  reserved: number
  available: number
}

export type AnalyticsSummary = {
  revenue: number
  orders: number
  units: number
  averageOrderValue: number
}

export type StockSummary = {
  stockLeft: number
  totalItems: number
  inStockCount: number
  lowStockCount: number
  outOfStockCount: number
  lowStock: LowStockItem[]
}

export type AnalyticsResult = {
  summary: AnalyticsSummary
  series: AnalyticsBucket[]
  topProducts: TopProduct[]
  stock: StockSummary
  currencyCode: string
}

export type AnalyticsWindow = {
  from: Date | null
  to: Date
  granularity: AnalyticsGranularity
}

export type BuildAnalyticsInput = {
  orders: AnalyticsOrder[]
  stockItems: StockItemInput[]
  from: Date | null
  to: Date
  granularity: AnalyticsGranularity
  lowStockThreshold?: number
  topLimit?: number
  lowStockLimit?: number
  fallbackCurrency?: string
}

const DAY_MS = 24 * 60 * 60 * 1000

const MAX_BUCKETS = 120

const RANGE_DAYS: Record<Exclude<AnalyticsRange, "12m" | "all">, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
}

export const toNumber = (value: unknown): number => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0
  }

  if (typeof value === "string") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }

  if (value && typeof value === "object" && "value" in value) {
    const parsed = Number((value as { value: unknown }).value)
    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

const round2 = (value: number): number => Math.round(value * 100) / 100

export const startOfUtcDay = (date: Date): Date =>
  new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  )

export const startOfUtcWeek = (date: Date): Date => {
  const day = date.getUTCDay()
  const diff = day === 0 ? 6 : day - 1
  const start = startOfUtcDay(date)
  return new Date(start.getTime() - diff * DAY_MS)
}

export const startOfUtcMonth = (date: Date): Date =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))

const startOfBucket = (
  date: Date,
  granularity: AnalyticsGranularity
): Date => {
  if (granularity === "month") {
    return startOfUtcMonth(date)
  }

  if (granularity === "week") {
    return startOfUtcWeek(date)
  }

  return startOfUtcDay(date)
}

const advanceBucket = (
  date: Date,
  granularity: AnalyticsGranularity
): Date => {
  if (granularity === "month") {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1))
  }

  const days = granularity === "week" ? 7 : 1
  return new Date(date.getTime() + days * DAY_MS)
}

const pad = (value: number): string => String(value).padStart(2, "0")

export const bucketKey = (
  date: Date,
  granularity: AnalyticsGranularity
): string => {
  if (granularity === "month") {
    return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}`
  }

  const normalized = granularity === "week" ? startOfUtcWeek(date) : date
  const year = normalized.getUTCFullYear()
  const month = pad(normalized.getUTCMonth() + 1)
  const day = pad(normalized.getUTCDate())

  return `${year}-${month}-${day}`
}

export const bucketLabel = (
  key: string,
  granularity: AnalyticsGranularity
): string => {
  if (granularity === "month") {
    const [year, month] = key.split("-").map(Number)
    const date = new Date(Date.UTC(year, month - 1, 1))
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      year: "2-digit",
      timeZone: "UTC",
    }).format(date)
  }

  const [year, month, day] = key.split("-").map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date)
}

export const resolveAnalyticsWindow = (
  range: AnalyticsRange,
  granularity?: AnalyticsGranularity,
  now: Date = new Date()
): AnalyticsWindow => {
  if (range === "all") {
    return { from: null, to: now, granularity: granularity ?? "month" }
  }

  if (range === "12m") {
    const start = startOfUtcMonth(
      new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1))
    )
    return { from: start, to: now, granularity: granularity ?? "month" }
  }

  const days = RANGE_DAYS[range]
  const start = startOfUtcDay(
    new Date(now.getTime() - (days - 1) * DAY_MS)
  )

  return {
    from: start,
    to: now,
    granularity: granularity ?? (range === "90d" ? "week" : "day"),
  }
}

export const buildBuckets = (
  from: Date,
  to: Date,
  granularity: AnalyticsGranularity,
  maxBuckets: number = MAX_BUCKETS
): Array<{ key: string; label: string }> => {
  const keys: string[] = []
  const end = startOfBucket(to, granularity)
  let cursor = startOfBucket(from, granularity)
  let guard = 0

  while (cursor.getTime() <= end.getTime() && guard < 5000) {
    keys.push(bucketKey(cursor, granularity))
    cursor = advanceBucket(cursor, granularity)
    guard += 1
  }

  const trimmed =
    keys.length > maxBuckets ? keys.slice(keys.length - maxBuckets) : keys

  return trimmed.map((key) => ({ key, label: bucketLabel(key, granularity) }))
}

const earliestOrderDate = (orders: AnalyticsOrder[]): Date | null => {
  let earliest: Date | null = null

  for (const order of orders) {
    const date = new Date(order.created_at)

    if (Number.isNaN(date.getTime())) {
      continue
    }

    if (!earliest || date.getTime() < earliest.getTime()) {
      earliest = date
    }
  }

  return earliest
}

const mostCommonCurrency = (counts: Map<string, number>): string | null => {
  let best: string | null = null
  let bestCount = 0

  for (const [code, count] of counts) {
    if (count > bestCount) {
      best = code
      bestCount = count
    }
  }

  return best
}

export const aggregateStock = (
  items: StockItemInput[],
  lowStockThreshold: number = 5,
  lowStockLimit: number = 8
): StockSummary => {
  let stockLeft = 0
  let inStockCount = 0
  let lowStockCount = 0
  let outOfStockCount = 0
  const lowStock: LowStockItem[] = []

  for (const item of items) {
    const stocked = toNumber(item.stocked_quantity)
    const reserved = toNumber(item.reserved_quantity)
    const available = stocked - reserved
    const variant = item.variants?.[0] ?? null
    const productTitle = variant?.product?.title ?? null
    const variantTitle = variant?.title ?? null
    const title =
      [productTitle, variantTitle].filter(Boolean).join(" - ") ||
      item.sku ||
      item.id

    stockLeft += Math.max(0, available)

    if (available <= 0) {
      outOfStockCount += 1
      continue
    }

    inStockCount += 1

    if (available <= lowStockThreshold) {
      lowStockCount += 1
      lowStock.push({
        id: item.id,
        sku: item.sku ?? "",
        title,
        stocked: round2(stocked),
        reserved: round2(reserved),
        available: round2(available),
      })
    }
  }

  lowStock.sort(
    (a, b) => a.available - b.available || a.title.localeCompare(b.title)
  )

  return {
    stockLeft: round2(stockLeft),
    totalItems: items.length,
    inStockCount,
    lowStockCount,
    outOfStockCount,
    lowStock: lowStock.slice(0, lowStockLimit),
  }
}

export const buildAnalytics = (input: BuildAnalyticsInput): AnalyticsResult => {
  const {
    orders,
    stockItems,
    to,
    granularity,
    lowStockThreshold = 5,
    topLimit = 5,
    lowStockLimit = 8,
    fallbackCurrency = "usd",
  } = input

  const effectiveFrom =
    input.from ?? earliestOrderDate(orders) ?? startOfUtcMonth(to)
  const buckets = buildBuckets(effectiveFrom, to, granularity)

  const seriesByKey = new Map<string, AnalyticsBucket>()

  for (const bucket of buckets) {
    seriesByKey.set(bucket.key, {
      key: bucket.key,
      label: bucket.label,
      revenue: 0,
      orders: 0,
      units: 0,
    })
  }

  let revenue = 0
  let units = 0
  const productMap = new Map<string, TopProduct>()
  const currencyCounts = new Map<string, number>()

  for (const order of orders) {
    const orderRevenue = toNumber(order.total)
    const orderUnits = (order.items ?? []).reduce(
      (sum, item) => sum + toNumber(item.quantity),
      0
    )

    revenue += orderRevenue
    units += orderUnits

    if (order.currency_code) {
      const code = order.currency_code
      currencyCounts.set(code, (currencyCounts.get(code) ?? 0) + 1)
    }

    const key = bucketKey(new Date(order.created_at), granularity)
    const bucket = seriesByKey.get(key)

    if (bucket) {
      bucket.revenue += orderRevenue
      bucket.orders += 1
      bucket.units += orderUnits
    }

    for (const item of order.items ?? []) {
      const quantity = toNumber(item.quantity)
      const lineRevenue =
        toNumber(item.subtotal ?? item.total) ||
        quantity * toNumber(item.unit_price)
      const id = item.product_id || item.variant_id || item.title || "unknown"
      const title = item.title || "Untitled product"
      const current = productMap.get(id)

      if (current) {
        current.quantity += quantity
        current.revenue += lineRevenue
      } else {
        productMap.set(id, { id, title, quantity, revenue: lineRevenue })
      }
    }
  }

  const topProducts = Array.from(productMap.values())
    .sort((a, b) => b.revenue - a.revenue || b.quantity - a.quantity)
    .slice(0, topLimit)
    .map((product) => ({
      ...product,
      quantity: round2(product.quantity),
      revenue: round2(product.revenue),
    }))

  const series = buckets.map(
    (bucket) =>
      seriesByKey.get(bucket.key) ?? {
        key: bucket.key,
        label: bucket.label,
        revenue: 0,
        orders: 0,
        units: 0,
      }
  )

  return {
    summary: {
      revenue: round2(revenue),
      orders: orders.length,
      units: round2(units),
      averageOrderValue: orders.length ? round2(revenue / orders.length) : 0,
    },
    series,
    topProducts,
    stock: aggregateStock(stockItems, lowStockThreshold, lowStockLimit),
    currencyCode: mostCommonCurrency(currencyCounts) ?? fallbackCurrency,
  }
}
