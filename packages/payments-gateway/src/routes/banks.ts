import { Hono } from "hono"
import type { Context } from "hono"
import { listBanksForVendor } from "../services/bankDirectory.js"
import { isPaystackTestKey } from "../services/banks.js"
import { vendorAuth } from "../middleware/vendorAuth.js"
import type { VendorEnv } from "../env.js"

export const banksRouter = new Hono<VendorEnv>()

banksRouter.use("*", vendorAuth)

banksRouter.get("/banks", async (c: Context<VendorEnv>) => {
  const vendor = c.get("vendor")

  const banks = await listBanksForVendor(vendor)

  return c.json({
    data: banks,
    test_mode: isPaystackTestKey(process.env.PAYSTACK_SECRET_KEY ?? ""),
  })
})
