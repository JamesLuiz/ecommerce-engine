import {
  aggregateStock,
  bucketKey,
  buildAnalytics,
  buildBuckets,
  resolveAnalyticsWindow,
} from "../analytics"

const NOW = new Date("2026-11-11T15:30:00.000Z")

describe("analytics window", () => {
  it("resolves the 30 day preset to day buckets", () => {
    const window = resolveAnalyticsWindow("30d", undefined, NOW)

    expect(window.granularity).toBe("day")
    expect(window.to.toISOString()).toBe(NOW.toISOString())
    expect(window.from?.toISOString()).toBe("2026-10-13T00:00:00.000Z")
  })

  it("resolves the 90 day preset to week buckets", () => {
    const window = resolveAnalyticsWindow("90d", undefined, NOW)

    expect(window.granularity).toBe("week")
    expect(window.from?.toISOString()).toBe("2026-08-14T00:00:00.000Z")
  })

  it("resolves the 12 month preset to month buckets", () => {
    const window = resolveAnalyticsWindow("12m", undefined, NOW)

    expect(window.granularity).toBe("month")
    expect(window.from?.toISOString()).toBe("2025-12-01T00:00:00.000Z")
  })

  it("leaves the all preset open ended", () => {
    const window = resolveAnalyticsWindow("all", undefined, NOW)

    expect(window.from).toBeNull()
    expect(window.granularity).toBe("month")
  })
})

describe("analytics buckets", () => {
  it("builds UTC day keys", () => {
    expect(
      bucketKey(new Date("2026-11-11T23:59:59.000Z"), "day")
    ).toBe("2026-11-11")
  })

  it("builds ISO week keys anchored on Monday", () => {
    expect(
      bucketKey(new Date("2026-11-11T10:00:00.000Z"), "week")
    ).toBe("2026-11-09")
    expect(
      bucketKey(new Date("2026-11-09T00:00:00.000Z"), "week")
    ).toBe("2026-11-09")
  })

  it("builds month keys", () => {
    expect(bucketKey(new Date("2026-01-31T23:00:00.000Z"), "month")).toBe(
      "2026-01"
    )
  })

  it("fills every bucket in a range", () => {
    const buckets = buildBuckets(
      new Date("2026-11-01T00:00:00.000Z"),
      new Date("2026-11-03T12:00:00.000Z"),
      "day"
    )

    expect(buckets.map((bucket) => bucket.key)).toEqual([
      "2026-11-01",
      "2026-11-02",
      "2026-11-03",
    ])
    expect(buckets.map((bucket) => bucket.label)).toEqual([
      "Nov 1",
      "Nov 2",
      "Nov 3",
    ])
  })

  it("crosses month and year boundaries", () => {
    const buckets = buildBuckets(
      new Date("2026-11-01T00:00:00.000Z"),
      new Date("2027-02-15T00:00:00.000Z"),
      "month"
    )

    expect(buckets.map((bucket) => bucket.key)).toEqual([
      "2026-11",
      "2026-12",
      "2027-01",
      "2027-02",
    ])
  })
})

describe("buildAnalytics", () => {
  const orders = [
    {
      id: "order_1",
      created_at: "2026-11-10T09:00:00.000Z",
      total: 100,
      currency_code: "usd",
      items: [
        {
          title: "T-Shirt",
          product_id: "prod_tshirt",
          variant_id: "variant_s",
          quantity: 2,
          unit_price: 40,
          subtotal: 80,
        },
      ],
    },
    {
      id: "order_2",
      created_at: "2026-11-11T09:00:00.000Z",
      total: 50,
      currency_code: "usd",
      items: [
        {
          title: "Sweatpants",
          product_id: "prod_pants",
          variant_id: "variant_m",
          quantity: 1,
          unit_price: 50,
          subtotal: 50,
        },
      ],
    },
  ]

  it("summarises revenue, orders, units and average order value", () => {
    const result = buildAnalytics({
      orders,
      stockItems: [],
      from: new Date("2026-11-01T00:00:00.000Z"),
      to: new Date("2026-11-12T00:00:00.000Z"),
      granularity: "day",
    })

    expect(result.summary).toEqual({
      revenue: 150,
      orders: 2,
      units: 3,
      averageOrderValue: 75,
    })
    expect(result.currencyCode).toBe("usd")
  })

  it("places revenue in the right day bucket and fills gaps", () => {
    const result = buildAnalytics({
      orders,
      stockItems: [],
      from: new Date("2026-11-01T00:00:00.000Z"),
      to: new Date("2026-11-12T00:00:00.000Z"),
      granularity: "day",
    })

    expect(result.series).toHaveLength(12)

    const byKey = new Map(
      result.series.map((bucket) => [bucket.key, bucket])
    )

    expect(byKey.get("2026-11-10")).toMatchObject({
      revenue: 100,
      orders: 1,
      units: 2,
    })
    expect(byKey.get("2026-11-11")).toMatchObject({
      revenue: 50,
      orders: 1,
      units: 1,
    })
    expect(byKey.get("2026-11-05")).toMatchObject({
      revenue: 0,
      orders: 0,
      units: 0,
    })
  })

  it("ranks top products by revenue", () => {
    const result = buildAnalytics({
      orders,
      stockItems: [],
      from: new Date("2026-11-01T00:00:00.000Z"),
      to: new Date("2026-11-12T00:00:00.000Z"),
      granularity: "day",
    })

    expect(result.topProducts).toEqual([
      {
        id: "prod_tshirt",
        title: "T-Shirt",
        quantity: 2,
        revenue: 80,
      },
      {
        id: "prod_pants",
        title: "Sweatpants",
        quantity: 1,
        revenue: 50,
      },
    ])
  })

  it("falls back to unit price when a line has no subtotal", () => {
    const result = buildAnalytics({
      orders: [
        {
          id: "order_3",
          created_at: "2026-11-10T09:00:00.000Z",
          total: 30,
          items: [
            {
              title: "Cap",
              product_id: "prod_cap",
              quantity: 3,
              unit_price: 10,
            },
          ],
        },
      ],
      stockItems: [],
      from: new Date("2026-11-01T00:00:00.000Z"),
      to: new Date("2026-11-12T00:00:00.000Z"),
      granularity: "day",
    })

    expect(result.topProducts[0]).toMatchObject({
      id: "prod_cap",
      revenue: 30,
      quantity: 3,
    })
  })

  it("handles an empty store", () => {
    const result = buildAnalytics({
      orders: [],
      stockItems: [],
      from: new Date("2026-11-01T00:00:00.000Z"),
      to: new Date("2026-11-12T00:00:00.000Z"),
      granularity: "day",
      fallbackCurrency: "ngn",
    })

    expect(result.summary.revenue).toBe(0)
    expect(result.summary.averageOrderValue).toBe(0)
    expect(result.topProducts).toEqual([])
    expect(result.currencyCode).toBe("ngn")
    expect(result.series).toHaveLength(12)
    expect(result.series.every((bucket) => bucket.revenue === 0)).toBe(true)
  })

  it("derives an open ended window from the earliest order", () => {
    const result = buildAnalytics({
      orders,
      stockItems: [],
      from: null,
      to: new Date("2026-12-01T00:00:00.000Z"),
      granularity: "month",
    })

    expect(result.series.map((bucket) => bucket.key)).toEqual([
      "2026-11",
      "2026-12",
    ])
  })
})

describe("aggregateStock", () => {
  it("sums available stock and flags low and out of stock items", () => {
    const result = aggregateStock(
      [
        {
          id: "iitem_1",
          sku: "SHIRT-S",
          stocked_quantity: 12,
          reserved_quantity: 2,
          variants: [
            {
              title: "S",
              product: { title: "T-Shirt" },
            },
          ],
        },
        {
          id: "iitem_2",
          sku: "SHIRT-M",
          stocked_quantity: 5,
          reserved_quantity: 2,
        },
        {
          id: "iitem_3",
          sku: "SHIRT-L",
          stocked_quantity: 1,
          reserved_quantity: 1,
        },
        {
          id: "iitem_4",
          sku: "SHIRT-XL",
          stocked_quantity: 0,
          reserved_quantity: 3,
        },
      ],
      5,
      8
    )

    expect(result.stockLeft).toBe(13)
    expect(result.totalItems).toBe(4)
    expect(result.inStockCount).toBe(2)
    expect(result.lowStockCount).toBe(1)
    expect(result.outOfStockCount).toBe(2)
    expect(result.lowStock).toEqual([
      {
        id: "iitem_2",
        sku: "SHIRT-M",
        title: "SHIRT-M",
        stocked: 5,
        reserved: 2,
        available: 3,
      },
    ])
  })

  it("limits the low stock list to the most urgent items", () => {
    const result = aggregateStock(
      [
        { id: "a", sku: "A", stocked_quantity: 4, reserved_quantity: 0 },
        { id: "b", sku: "B", stocked_quantity: 2, reserved_quantity: 0 },
        { id: "c", sku: "C", stocked_quantity: 3, reserved_quantity: 0 },
      ],
      5,
      2
    )

    expect(result.lowStock.map((item) => item.sku)).toEqual(["B", "C"])
  })
})
