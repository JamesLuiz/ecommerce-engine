import { model } from "@medusajs/framework/utils"

/**
 * One row per uploaded storefront asset.
 *
 * The Medusa File Module stores bytes in the configured provider (local disk
 * by default) and keeps nothing in the database, so there is no way to list a
 * tenant's uploads or link an upload to the store it belongs to. This model is
 * the durable record: it is written after every upload and read back by the
 * admin media library.
 */
const StorefrontAsset = model.define("storefront_asset", {
  id: model.id({ prefix: "sfa" }).primaryKey(),
  store_id: model.text(),
  file_id: model.text(),
  url: model.text(),
  filename: model.text(),
  mime_type: model.text().nullable(),
  size: model.number().nullable(),
  // logo | favicon | hero | showcase | general
  kind: model.text().default("general"),
  alt: model.text().nullable(),
})

export default StorefrontAsset
