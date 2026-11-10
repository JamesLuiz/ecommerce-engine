import assert from "node:assert/strict"
import { afterEach, describe, it } from "node:test"

const originalEnv = { ...process.env }

afterEach(() => {
  process.env = { ...originalEnv }
})

describe("hydrateRuntimeBrandConfig", () => {
  it("does not mutate process.env between refreshes", async () => {
    const baseEnv = {
      MEDUSA_BACKEND_URL: "http://localhost:9000",
      MEDUSA_PUBLISHABLE_KEY: "pk_test_123",
      STORE_NAME: "Original Store",
      BRAND_PRIMARY_COLOR: "#111111",
      BRAND_LOGO_URL: "https://example.com/old-logo.svg",
    }
    process.env = { ...baseEnv }

    const globalFetch = global.fetch
    global.fetch = async () =>
      new Response(
        JSON.stringify({
          brand: {
            name: "Fresh Store",
            primaryColor: "#123456",
            logoUrl: "https://example.com/new-logo.svg",
          },
          hasStorefrontSettings: false,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )

    try {
      const { hydrateRuntimeBrandConfig } = await import("./runtime-config.ts")
      const result = await hydrateRuntimeBrandConfig()

      assert.equal(result.storeName, "Fresh Store")
      assert.equal(process.env.STORE_NAME, "Original Store")
      assert.equal(process.env.BRAND_PRIMARY_COLOR, "#111111")
      assert.equal(process.env.BRAND_LOGO_URL, "https://example.com/old-logo.svg")
    } finally {
      global.fetch = globalFetch
    }
  })

})
