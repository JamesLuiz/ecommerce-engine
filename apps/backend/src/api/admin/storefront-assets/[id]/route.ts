import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { deleteStorefrontAssetWorkflow } from "../../../../workflows/storefront-asset/delete-storefront-asset"

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const id = req.params.id

  await deleteStorefrontAssetWorkflow(req.scope).run({ input: { id } })

  res.json({ id, deleted: true })
}
