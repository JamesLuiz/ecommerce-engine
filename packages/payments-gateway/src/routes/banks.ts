import { Hono } from "hono"
import type { Context } from "hono"
import { redis } from "../redis.js"
import { PaystackClient } from "../services/paystack.js"
import { vendorAuth } from "../middleware/vendorAuth.js"
import type { Bank } from "../types.js"
import type { VendorEnv } from "../env.js"

export const banksRouter = new Hono<VendorEnv>()

banksRouter.use("*", vendorAuth)

banksRouter.get("/banks", async (c: Context<VendorEnv>) => {
  const cacheKey = "banks:nigeria"

  const cached = await redis.get(cacheKey)

  if (cached) {
    return c.json(JSON.parse(cached) as { data: Bank[] })
  }

  const client = new PaystackClient(
    process.env.PAYSTACK_SECRET_KEY ?? "",
    process.env.PAYSTACK_BASE_URL ?? "https://api.paystack.co",
  )

  const banks = await client.listBanks()

  await redis.set(cacheKey, JSON.stringify({ data: banks }), "EX", 60 * 60 * 24)

  return c.json({ data: banks })
})
