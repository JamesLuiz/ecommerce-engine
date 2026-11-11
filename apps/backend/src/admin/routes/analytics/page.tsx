import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ChartBar } from "@medusajs/icons"
import {
  Badge,
  Button,
  Container,
  Heading,
  Select,
  Skeleton,
  Text,
  toast,
} from "@medusajs/ui"
import { useCallback, useEffect, useState } from "react"

import {
  ChartCard,
  KpiCard,
  OrdersBarChart,
  RevenueChart,
  StockDonut,
  TopProductsBars,
} from "./charts"
import {
  formatCompact,
  formatCurrency,
  formatNumber,
  granularityOptions,
  rangeOptions,
  type AnalyticsGranularity,
  type AnalyticsRangePreset,
  type AnalyticsResponse,
} from "./lib"

const AnalyticsPage = () => {
  const [range, setRange] = useState<AnalyticsRangePreset>("30d")
  const [granularity, setGranularity] = useState<AnalyticsGranularity | "auto">(
    "auto"
  )
  const [data, setData] = useState<AnalyticsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams({ range })

        if (granularity !== "auto") {
          params.set("granularity", granularity)
        }

        const response = await fetch(`/admin/analytics?${params.toString()}`, {
          credentials: "same-origin",
          signal,
        })

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as {
            message?: string
          } | null
          throw new Error(
            payload?.message ?? `Request failed with status ${response.status}`
          )
        }

        setData((await response.json()) as AnalyticsResponse)
      } catch (caught) {
        const message = (caught as Error).message

        if ((caught as Error).name === "AbortError") {
          return
        }

        setError(message)
        toast.error("Could not load analytics", { description: message })
      } finally {
        setLoading(false)
      }
    },
    [range, granularity]
  )

  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal)

    return () => controller.abort()
  }, [load])

  const rangeLabel =
    rangeOptions.find((option) => option.value === range)?.label ??
    "Selected period"

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "grid", gap: 4 }}>
          <Heading level="h1">Analytics</Heading>
          <Text size="small" style={{ color: "var(--fg-subtle)" }}>
            Sales, revenue and stock health for this store.
          </Text>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Select
            value={range}
            onValueChange={(value) => setRange(value as AnalyticsRangePreset)}
          >
            <Select.Trigger style={{ minWidth: 160 }}>
              <Select.Value placeholder="Range" />
            </Select.Trigger>
            <Select.Content>
              {rangeOptions.map((option) => (
                <Select.Item key={option.value} value={option.value}>
                  {option.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>

          <Select
            value={granularity}
            onValueChange={(value) =>
              setGranularity(value as AnalyticsGranularity | "auto")
            }
          >
            <Select.Trigger style={{ minWidth: 140 }}>
              <Select.Value placeholder="Group by" />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="auto">Auto</Select.Item>
              {granularityOptions.map((option) => (
                <Select.Item key={option.value} value={option.value}>
                  {option.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>

          <Button
            variant="secondary"
            onClick={() => load()}
            disabled={loading}
          >
            Refresh
          </Button>
        </div>
      </div>

      {error && !data ? (
        <Container style={{ padding: 24 }}>
          <div style={{ display: "grid", gap: 12 }}>
            <Text size="small">{error}</Text>
            <div>
              <Button variant="secondary" onClick={() => load()}>
                Try again
              </Button>
            </div>
          </div>
        </Container>
      ) : null}

      {loading && !data ? (
        <div style={{ display: "grid", gap: 16 }}>
          <div
            style={{
              display: "grid",
              gap: 16,
              gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
            }}
          >
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton
                key={index}
                style={{ height: 96, borderRadius: 8 }}
              />
            ))}
          </div>
          <Skeleton style={{ height: 340, borderRadius: 8 }} />
          <Skeleton style={{ height: 260, borderRadius: 8 }} />
        </div>
      ) : null}

      {data ? (
        <div style={{ display: "grid", gap: 16 }}>
          <div
            style={{
              display: "grid",
              gap: 16,
              gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
            }}
          >
            <KpiCard
              label="Total revenue"
              value={formatCurrency(data.summary.revenue, data.currencyCode)}
              hint={rangeLabel}
            />
            <KpiCard
              label="Orders"
              value={formatNumber(data.summary.orders)}
              hint={`${formatNumber(data.summary.units)} units sold`}
            />
            <KpiCard
              label="Average order value"
              value={formatCurrency(
                data.summary.averageOrderValue,
                data.currencyCode
              )}
              hint="Revenue divided by orders"
            />
            <KpiCard
              label="Products sold"
              value={formatNumber(data.summary.units)}
              hint="Units across all line items"
            />
            <KpiCard
              label="Stock left"
              value={formatCompact(data.stock.stockLeft)}
              hint={`${formatNumber(
                data.stock.inStockCount
              )} stocked inventory items`}
            />
            <KpiCard
              label="Needs attention"
              value={formatNumber(
                data.stock.lowStockCount + data.stock.outOfStockCount
              )}
              hint={`${formatNumber(
                data.stock.lowStockCount
              )} low - ${formatNumber(data.stock.outOfStockCount)} out`}
              tone={
                data.stock.outOfStockCount > 0
                  ? "danger"
                  : data.stock.lowStockCount > 0
                    ? "warning"
                    : "positive"
              }
            />
          </div>

          <div
            style={{
              display: "grid",
              gap: 16,
              gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
            }}
          >
            <div style={{ gridColumn: "1 / -1", minWidth: 0 }}>
              <ChartCard
                title="Revenue"
                subtitle={`${rangeLabel} - grouped by ${
                  data.range.granularity
                }`}
              >
                <RevenueChart
                  data={data.series}
                  currencyCode={data.currencyCode}
                />
              </ChartCard>
            </div>

            <ChartCard
              title="Orders"
              subtitle="Number of orders per period"
            >
              <OrdersBarChart data={data.series} />
            </ChartCard>

            <ChartCard title="Top products" subtitle="Ranked by revenue">
              <TopProductsBars
                products={data.topProducts}
                currencyCode={data.currencyCode}
              />
            </ChartCard>

            <ChartCard
              title="Stock health"
              subtitle="Inventory items by availability"
            >
              <StockDonut
                inStock={data.stock.inStockCount}
                lowStock={data.stock.lowStockCount}
                outOfStock={data.stock.outOfStockCount}
              />
            </ChartCard>

            <div style={{ gridColumn: "1 / -1", minWidth: 0 }}>
              <ChartCard
                title="Low stock"
                subtitle="Inventory items at or below the low-stock threshold"
              >
                {data.stock.lowStock.length === 0 ? (
                  <Text size="small" style={{ color: "var(--fg-muted)" }}>
                    No inventory items are running low.
                  </Text>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        minWidth: 560,
                      }}
                    >
                      <thead>
                        <tr>
                          {[
                            "Product",
                            "SKU",
                            "Stocked",
                            "Reserved",
                            "Available",
                          ].map((heading) => (
                            <th
                              key={heading}
                              style={{
                                textAlign: "left",
                                padding: "8px",
                                fontSize: 12,
                                fontWeight: 500,
                                color: "var(--fg-subtle)",
                              }}
                            >
                              {heading}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data.stock.lowStock.map((item) => (
                          <tr
                            key={item.id}
                            style={{
                              borderTop: "1px solid var(--border-base)",
                            }}
                          >
                            <td style={{ padding: "10px 8px" }}>
                              <Text size="small">{item.title}</Text>
                            </td>
                            <td style={{ padding: "10px 8px" }}>
                              <Text
                                size="small"
                                style={{ color: "var(--fg-subtle)" }}
                              >
                                {item.sku || "-"}
                              </Text>
                            </td>
                            <td style={{ padding: "10px 8px" }}>
                              <Text size="small">
                                {formatNumber(item.stocked)}
                              </Text>
                            </td>
                            <td style={{ padding: "10px 8px" }}>
                              <Text size="small">
                                {formatNumber(item.reserved)}
                              </Text>
                            </td>
                            <td style={{ padding: "10px 8px" }}>
                              <Badge
                                size="2xsmall"
                                color={item.available <= 0 ? "red" : "orange"}
                              >
                                {formatNumber(item.available)}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </ChartCard>
            </div>
          </div>

          {data.truncated ? (
            <Text size="xsmall" style={{ color: "var(--fg-muted)" }}>
              Results are capped at 20,000 orders and 20,000 inventory items.
              Narrow the range for exact totals.
            </Text>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Analytics",
  icon: ChartBar,
  rank: 10,
})

export default AnalyticsPage
