import { configureStoreSearch, defineMiddlewares } from "@medusajs/framework/http"
import multer from "multer"

// The product index declares filterable `status` and `sales_channel_ids`, so
// the route narrows it to published products in the key's sales channels.
//
// Medusa only registers multipart parsing for its own `/admin/uploads` route,
// so the storefront media library needs the same in-memory multer middleware.
const upload = multer({ storage: multer.memoryStorage() })

export default defineMiddlewares({
  routes: [
    {
      method: ["POST"],
      matcher: "/admin/storefront-assets",
      middlewares: [upload.array("files")],
    },
    {
      method: ["POST"],
      matcher: "/store/search",
      middlewares: [
        configureStoreSearch({
          allowed_indexes: {
            product: true,
          },
        }),
      ],
    },
  ],
})
