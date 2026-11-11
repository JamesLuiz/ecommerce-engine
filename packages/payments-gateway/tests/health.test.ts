import { describe, expect, it } from "vitest"
import { app } from "../src/app"

describe("GET /healthz", () => {
  it("returns ok", async () => {
    const response = await app.request("/healthz")

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ status: "ok" })
  })
})
