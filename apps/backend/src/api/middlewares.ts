import { configureStoreSearch, defineMiddlewares, validateAndTransformBody } from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"
import multer from "multer"

const upload = multer({ storage: multer.memoryStorage() })

export const ResolveAccountSchema = z.object({
  bank_code: z.string().min(1),
  account_number: z.string().regex(/^\d{10}$/, "Account number must be exactly 10 digits"),
})

export const SettlementSchema = z.object({
  bank_code: z.string().min(1),
  account_number: z.string().regex(/^\d{10}$/, "Account number must be exactly 10 digits"),
})

export default defineMiddlewares({
  routes: [
    {
      method: ["POST"],
      matcher: "/admin/payment/resolve-account",
      middlewares: [validateAndTransformBody(ResolveAccountSchema)],
    },
    {
      method: ["PUT"],
      matcher: "/admin/payment/settlement",
      middlewares: [validateAndTransformBody(SettlementSchema)],
    },
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
