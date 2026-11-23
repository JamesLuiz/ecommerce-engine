import { configureStoreSearch, defineMiddlewares, validateAndTransformBody } from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"
import multer from "multer"

const upload = multer({ storage: multer.memoryStorage() })

const manualReceiptUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
})

export const ResolveAccountSchema = z.object({
  bank_code: z.string().min(1),
  account_number: z.string().regex(/^\d{10}$/, "Account number must be exactly 10 digits"),
})

export const SettlementSchema = z.object({
  bank_code: z.string().min(1),
  account_number: z.string().regex(/^\d{10}$/, "Account number must be exactly 10 digits"),
})

export const ManualPaymentSchema = z.object({
  cart_id: z.string().min(1),
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
      method: ["PUT"],
      matcher: "/admin/payment/manual-account",
      middlewares: [validateAndTransformBody(SettlementSchema)],
    },
    {
      method: ["POST"],
      matcher: "/store/manual-payment",
      middlewares: [
        manualReceiptUpload.single("receipt"),
        validateAndTransformBody(ManualPaymentSchema),
      ],
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
