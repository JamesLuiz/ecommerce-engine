export type AnalyticsRangePreset = "7d" | "30d" | "90d" | "12m" | "all"

export type AnalyticsGranularity = "day" | "week" | "month"

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

export type AnalyticsResponse = {
  range: {
    preset: AnalyticsRangePreset
    from: string
    to: string
    granularity: AnalyticsGranularity
  }
  currencyCode: string
  summary: {
    revenue: number
    orders: number
    units: number
    averageOrderValue: number
  }
  stock: {
    stockLeft: number
    totalItems: number
    inStockCount: number
    lowStockCount: number
    outOfStockCount: number
    lowStock: LowStockItem[]
  }
  series: AnalyticsBucket[]
  topProducts: TopProduct[]
  truncated: boolean
}

export const formatNumber = (value: number): string =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value)

export const formatCompact = (value: number): string =>
  new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value)

export const formatCurrency = (
  value: number,
  currencyCode: string
): string => {
  const code = (currencyCode || "usd").toUpperCase()
  const compact = Math.abs(value) >= 1000

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      maximumFractionDigits: compact ? 0 : 2,
      minimumFractionDigits: compact ? 0 : 2,
    }).format(value)
  } catch {
    return `${code} ${formatNumber(value)}`
  }
}

export const rangeOptions: Array<{
  value: AnalyticsRangePreset
  label: string
}> = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "12m", label: "Last 12 months" },
  { value: "all", label: "All time" },
]

export const granularityOptions: Array<{
  value: AnalyticsGranularity
  label: string
}> = [
  { value: "day", label: "Daily" },
  { value: "week", label: "Weekly" },
  { value: "month", label: "Monthly" },
]

export const niceCeil = (value: number): number => {
  if (!Number.isFinite(value) || value <= 0) {
    return 1
  }

  const magnitude = Math.pow(10, Math.floor(Math.log10(value)))
  const normalized = value / magnitude
  const nice =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10

  return nice * magnitude
}

export const pickLabelIndices = (count: number, maxLabels: number): number[] => {
  if (count <= 0) {
    return []
  }

  if (count <= maxLabels) {
    return Array.from({ length: count }, (_, index) => index)
  }

  const step = (count - 1) / (maxLabels - 1)

  return Array.from({ length: maxLabels }, (_, index) =>
    Math.round(index * step)
  )
}
