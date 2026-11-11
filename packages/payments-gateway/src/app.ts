import { Hono } from "hono"
import { errorHandler } from "./middleware/error.js"
import { adminVendorsRouter } from "./routes/admin.vendors.js"
import { banksRouter } from "./routes/banks.js"
import { settlementRouter } from "./routes/settlement.js"
import { transactionsRouter } from "./routes/transactions.js"
import { webhooksRouter } from "./routes/webhooks.paystack.js"
import type { VendorEnv } from "./env.js"

export const app = new Hono<VendorEnv>()

app.get("/healthz", (c) => c.json({ status: "ok" }))

app.route("/admin", adminVendorsRouter)
app.route("/v1", banksRouter)
app.route("/v1", settlementRouter)
app.route("/v1", transactionsRouter)
app.route("/webhooks", webhooksRouter)

app.onError(errorHandler)
