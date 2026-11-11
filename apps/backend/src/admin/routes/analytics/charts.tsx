import { Text } from "@medusajs/ui"
import { useId, useState } from "react"

import {
  formatCompact,
  formatCurrency,
  formatNumber,
  niceCeil,
  pickLabelIndices,
  type AnalyticsBucket,
  type TopProduct,
} from "./lib"

const CHART_WIDTH = 720
const CHART_HEIGHT = 260
const PAD = { top: 16, right: 16, bottom: 32, left: 56 }

const innerWidth = CHART_WIDTH - PAD.left - PAD.right
const innerHeight = CHART_HEIGHT - PAD.top - PAD.bottom
const baseline = PAD.top + innerHeight

const Tooltip = ({
  leftPercent,
  children,
}: {
  leftPercent: number
  children: React.ReactNode
}) => (
  <div
    style={{
      position: "absolute",
      left: `${leftPercent}%`,
      top: 8,
      transform: "translateX(-50%)",
      pointerEvents: "none",
      background: "var(--bg-component)",
      border: "1px solid var(--border-base)",
      borderRadius: 8,
      padding: "8px 10px",
      boxShadow: "0 8px 24px rgba(0, 0, 0, 0.12)",
      zIndex: 2,
      minWidth: 132,
      display: "grid",
      gap: 2,
    }}
  >
    {children}
  </div>
)

export const ChartCard = ({
  title,
  subtitle,
  action,
  children,
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
  children: React.ReactNode
}) => (
  <div
    style={{
      border: "1px solid var(--border-base)",
      borderRadius: 8,
      padding: 18,
      background: "var(--bg-base)",
      display: "grid",
      gap: 12,
      minWidth: 0,
    }}
  >
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 12,
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "grid", gap: 2 }}>
        <Text size="base" weight="plus">
          {title}
        </Text>
        {subtitle ? (
          <Text size="small" style={{ color: "var(--fg-subtle)" }}>
            {subtitle}
          </Text>
        ) : null}
      </div>
      {action}
    </div>
    {children}
  </div>
)

export const KpiCard = ({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string
  value: string
  hint?: string
  tone?: "default" | "positive" | "warning" | "danger"
}) => {
  const color =
    tone === "positive"
      ? "#16A34A"
      : tone === "warning"
        ? "#D97706"
        : tone === "danger"
          ? "#DC2626"
          : "var(--fg-base)"

  return (
    <div
      style={{
        border: "1px solid var(--border-base)",
        borderRadius: 8,
        padding: "16px 18px",
        background: "var(--bg-base)",
        display: "grid",
        gap: 4,
        minWidth: 0,
      }}
    >
      <Text size="small" style={{ color: "var(--fg-subtle)" }}>
        {label}
      </Text>
      <Text
        size="large"
        weight="plus"
        style={{
          color,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </Text>
      {hint ? (
        <Text size="xsmall" style={{ color: "var(--fg-muted)" }}>
          {hint}
        </Text>
      ) : null}
    </div>
  )
}

export const RevenueChart = ({
  data,
  currencyCode,
}: {
  data: AnalyticsBucket[]
  currencyCode: string
}) => {
  const gradientId = useId().replace(/:/g, "")
  const [hover, setHover] = useState<number | null>(null)

  const count = data.length
  const max = niceCeil(Math.max(1, ...data.map((bucket) => bucket.revenue)))
  const x = (index: number) =>
    PAD.left +
    (count <= 1 ? innerWidth / 2 : (index / (count - 1)) * innerWidth)
  const y = (value: number) => PAD.top + innerHeight - (value / max) * innerHeight
  const line = data
    .map(
      (bucket, index) =>
        `${index === 0 ? "M" : "L"} ${x(index).toFixed(2)} ${y(
          bucket.revenue
        ).toFixed(2)}`
    )
    .join(" ")
  const area =
    count > 0
      ? `${line} L ${x(count - 1).toFixed(2)} ${baseline} L ${x(
          0
        ).toFixed(2)} ${baseline} Z`
      : ""
  const labels = new Set(pickLabelIndices(count, 6))
  const gridSteps = [0, 0.25, 0.5, 0.75, 1]
  const total = data.reduce((sum, bucket) => sum + bucket.revenue, 0)
  const slotWidth = count <= 1 ? innerWidth : innerWidth / (count - 1)
  const slotX = (index: number) =>
    count <= 1 ? PAD.left : x(index) - slotWidth / 2
  const hovered = hover !== null ? data[hover] : null

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        role="img"
        aria-label="Revenue over time"
        style={{ width: "100%", height: "auto", display: "block" }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              style={{ stopColor: "var(--fg-interactive)", stopOpacity: 0.3 }}
            />
            <stop
              offset="100%"
              style={{ stopColor: "var(--fg-interactive)", stopOpacity: 0.02 }}
            />
          </linearGradient>
        </defs>

        {gridSteps.map((step) => {
          const gy = PAD.top + innerHeight - step * innerHeight
          return (
            <g key={step}>
              <line
                x1={PAD.left}
                y1={gy}
                x2={CHART_WIDTH - PAD.right}
                y2={gy}
                strokeDasharray={step === 0 ? undefined : "4 6"}
                style={{ stroke: "var(--border-base)" }}
              />
              <text
                x={PAD.left - 10}
                y={gy + 4}
                textAnchor="end"
                fontSize="11"
                style={{ fill: "var(--fg-muted)" }}
              >
                {formatCompact(max * step)}
              </text>
            </g>
          )
        })}

        {count > 0 ? <path d={area} fill={`url(#${gradientId})`} /> : null}
        {count > 0 ? (
          <path
            d={line}
            fill="none"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            style={{ stroke: "var(--fg-interactive)" }}
          />
        ) : null}

        {Array.from(labels).map((index) => (
          <text
            key={`label-${index}`}
            x={x(index)}
            y={CHART_HEIGHT - 8}
            textAnchor="middle"
            fontSize="11"
            style={{ fill: "var(--fg-muted)" }}
          >
            {data[index]?.label ?? ""}
          </text>
        ))}

        {hover !== null && data[hover] ? (
          <g>
            <line
              x1={x(hover)}
              y1={PAD.top}
              x2={x(hover)}
              y2={baseline}
              strokeDasharray="3 4"
              style={{ stroke: "var(--border-strong)" }}
            />
            <circle
              cx={x(hover)}
              cy={y(data[hover].revenue)}
              r="4.5"
              strokeWidth="2.5"
              style={{
                fill: "var(--bg-base)",
                stroke: "var(--fg-interactive)",
              }}
            />
          </g>
        ) : null}

        {data.map((bucket, index) => (
          <rect
            key={`hit-${bucket.key}`}
            x={slotX(index)}
            y={PAD.top}
            width={slotWidth}
            height={innerHeight}
            fill="transparent"
            onMouseEnter={() => setHover(index)}
            onMouseLeave={() => setHover(null)}
          />
        ))}
      </svg>

      {hovered && hover !== null ? (
        <Tooltip leftPercent={(x(hover) / CHART_WIDTH) * 100}>
          <Text size="xsmall" style={{ color: "var(--fg-subtle)" }}>
            {hovered.label}
          </Text>
          <Text size="small" weight="plus">
            {formatCurrency(hovered.revenue, currencyCode)}
          </Text>
          <Text size="xsmall" style={{ color: "var(--fg-muted)" }}>
            {formatNumber(hovered.orders)} orders - {formatNumber(hovered.units)}{" "}
            units
          </Text>
        </Tooltip>
      ) : null}

      {total === 0 ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <Text size="small" style={{ color: "var(--fg-muted)" }}>
            No sales in this period
          </Text>
        </div>
      ) : null}
    </div>
  )
}

export const OrdersBarChart = ({ data }: { data: AnalyticsBucket[] }) => {
  const [hover, setHover] = useState<number | null>(null)

  const count = data.length
  const max = niceCeil(Math.max(1, ...data.map((bucket) => bucket.orders)))
  const slot = count > 0 ? innerWidth / count : innerWidth
  const barWidth = Math.max(2, slot * 0.55)
  const labels = new Set(pickLabelIndices(count, 6))
  const hovered = hover !== null ? data[hover] : null
  const total = data.reduce((sum, bucket) => sum + bucket.orders, 0)

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        role="img"
        aria-label="Orders over time"
        style={{ width: "100%", height: "auto", display: "block" }}
      >
        {[0, 0.25, 0.5, 0.75, 1].map((step) => {
          const gy = PAD.top + innerHeight - step * innerHeight
          return (
            <g key={step}>
              <line
                x1={PAD.left}
                y1={gy}
                x2={CHART_WIDTH - PAD.right}
                y2={gy}
                strokeDasharray={step === 0 ? undefined : "4 6"}
                style={{ stroke: "var(--border-base)" }}
              />
              <text
                x={PAD.left - 10}
                y={gy + 4}
                textAnchor="end"
                fontSize="11"
                style={{ fill: "var(--fg-muted)" }}
              >
                {formatCompact(max * step)}
              </text>
            </g>
          )
        })}

        {data.map((bucket, index) => {
          const barHeight = (bucket.orders / max) * innerHeight
          const bx = PAD.left + index * slot + (slot - barWidth) / 2
          return (
            <g key={bucket.key}>
              <rect
                x={bx}
                y={PAD.top + innerHeight - barHeight}
                width={barWidth}
                height={Math.max(barHeight, bucket.orders > 0 ? 2 : 0)}
                rx={Math.min(4, barWidth / 2)}
                opacity={hover === null || hover === index ? 1 : 0.4}
                style={{ fill: "var(--fg-interactive)" }}
              />
              <rect
                x={PAD.left + index * slot}
                y={PAD.top}
                width={slot}
                height={innerHeight}
                fill="transparent"
                onMouseEnter={() => setHover(index)}
                onMouseLeave={() => setHover(null)}
              />
            </g>
          )
        })}

        {Array.from(labels).map((index) => (
          <text
            key={`label-${index}`}
            x={PAD.left + index * slot + slot / 2}
            y={CHART_HEIGHT - 8}
            textAnchor="middle"
            fontSize="11"
            style={{ fill: "var(--fg-muted)" }}
          >
            {data[index]?.label ?? ""}
          </text>
        ))}
      </svg>

      {hovered && hover !== null ? (
        <Tooltip
          leftPercent={
            ((PAD.left + hover * slot + slot / 2) / CHART_WIDTH) * 100
          }
        >
          <Text size="xsmall" style={{ color: "var(--fg-subtle)" }}>
            {hovered.label}
          </Text>
          <Text size="small" weight="plus">
            {formatNumber(hovered.orders)} orders
          </Text>
          <Text size="xsmall" style={{ color: "var(--fg-muted)" }}>
            {formatNumber(hovered.units)} units
          </Text>
        </Tooltip>
      ) : null}

      {total === 0 ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <Text size="small" style={{ color: "var(--fg-muted)" }}>
            No orders in this period
          </Text>
        </div>
      ) : null}
    </div>
  )
}

export const TopProductsBars = ({
  products,
  currencyCode,
}: {
  products: TopProduct[]
  currencyCode: string
}) => {
  if (products.length === 0) {
    return (
      <Text size="small" style={{ color: "var(--fg-muted)" }}>
        No products sold in this period.
      </Text>
    )
  }

  const max = Math.max(1, ...products.map((product) => product.revenue))

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {products.map((product) => (
        <div key={product.id} style={{ display: "grid", gap: 5 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              gap: 12,
            }}
          >
            <Text
              size="small"
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                minWidth: 0,
              }}
            >
              {product.title}
            </Text>
            <Text
              size="small"
              style={{ whiteSpace: "nowrap", color: "var(--fg-subtle)" }}
            >
              {formatCurrency(product.revenue, currencyCode)}
            </Text>
          </div>
          <div
            style={{
              height: 8,
              borderRadius: 999,
              background: "var(--bg-subtle)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${Math.max(
                  2,
                  (product.revenue / max) * 100
                )}%`,
                borderRadius: 999,
                background: "var(--bg-interactive)",
              }}
            />
          </div>
          <Text size="xsmall" style={{ color: "var(--fg-muted)" }}>
            {formatNumber(product.quantity)} sold
          </Text>
        </div>
      ))}
    </div>
  )
}

export const StockDonut = ({
  inStock,
  lowStock,
  outOfStock,
}: {
  inStock: number
  lowStock: number
  outOfStock: number
}) => {
  const total = inStock + lowStock + outOfStock
  const segments = [
    { label: "In stock", value: inStock, color: "#22C55E" },
    { label: "Low stock", value: lowStock, color: "#F59E0B" },
    { label: "Out of stock", value: outOfStock, color: "#EF4444" },
  ]
  const radius = 54
  const circumference = 2 * Math.PI * radius
  let offset = 0

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 24,
        flexWrap: "wrap",
      }}
    >
      <svg
        viewBox="0 0 160 160"
        width="160"
        height="160"
        role="img"
        aria-label="Stock health"
      >
        <circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          strokeWidth="18"
          style={{ stroke: "var(--bg-subtle)" }}
        />
        {total > 0
          ? segments.map((segment) => {
              const length = (segment.value / total) * circumference
              const circle = (
                <circle
                  key={segment.label}
                  cx="80"
                  cy="80"
                  r={radius}
                  fill="none"
                  strokeWidth="18"
                  strokeDasharray={`${length} ${circumference - length}`}
                  strokeDashoffset={-offset}
                  transform="rotate(-90 80 80)"
                  style={{ stroke: segment.color }}
                />
              )
              offset += length
              return circle
            })
          : null}
        <text
          x="80"
          y="78"
          textAnchor="middle"
          fontSize="24"
          fontWeight="600"
          style={{ fill: "var(--fg-base)" }}
        >
          {formatNumber(total)}
        </text>
        <text
          x="80"
          y="98"
          textAnchor="middle"
          fontSize="11"
          style={{ fill: "var(--fg-muted)" }}
        >
          items
        </text>
      </svg>

      <div style={{ display: "grid", gap: 8 }}>
        {segments.map((segment) => (
          <div
            key={segment.label}
            style={{ display: "flex", alignItems: "center", gap: 8 }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 999,
                background: segment.color,
                display: "inline-block",
              }}
            />
            <Text size="small">{segment.label}</Text>
            <Text size="small" style={{ color: "var(--fg-subtle)" }}>
              {formatNumber(segment.value)}
            </Text>
          </div>
        ))}
      </div>
    </div>
  )
}
