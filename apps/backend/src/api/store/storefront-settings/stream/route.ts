import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

import { storeSettingsHub } from "../../../../lib/store-settings-hub"

/**
 * Server-sent events stream for storefront settings changes.
 *
 * The storefront connects here with its publishable API key and receives a
 * `storefront.settings.updated` event whenever staff save storefront settings
 * in the Medusa admin. The storefront then re-hydrates its UI (brand, theme,
 * layout, footer contact info, hero content, CSS variables) live without a
 * page reload.
 *
 * The store is identified by taking the first (and, in a single-tenant
 * deployment, only) store — consistent with the other /store routes in this
 * backend. Publishable-key authentication is applied by the default
 * /store/* route protection.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const storeModule = req.scope.resolve(Modules.STORE)
  const [store] = await storeModule.listStores({}, {
    select: ["id", "name", "metadata"],
  })

  if (!store) {
    res.status(404).json({ message: "No active store found" })
    return
  }

  res.status(200)
  res.setHeader("Content-Type", "text/event-stream")
  res.setHeader("Cache-Control", "no-cache, no-transform")
  res.setHeader("Connection", "keep-alive")
  res.setHeader("X-Accel-Buffering", "no")

  const send = (data: unknown) => {
    try {
      res.write(`data: ${JSON.stringify(data)}\n\n`)
    } catch {
      // Ignore writes after the connection has closed.
    }
  }

  // Let the client know the stream is open.
  send({ type: "connected", storeId: store.id })

  const unsubscribe = storeSettingsHub.subscribe(store.id, (event) => {
    send(event)
  })

  req.on("close", unsubscribe)
  req.on("aborted", unsubscribe)
  res.on("close", unsubscribe)
}
