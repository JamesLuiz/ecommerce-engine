import { sdk } from "@lib/config"
import { getAuthHeaders, getCacheTag } from "@lib/data/cookies"
import { MANUAL_PAYMENT_RECEIVED_MESSAGE } from "@lib/payment-status"
import { revalidateTag } from "next/cache"
import { NextRequest, NextResponse } from "next/server"

const MAX_RECEIPT_SIZE = 5 * 1024 * 1024
const ALLOWED_RECEIPT_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"]

type ManualPaymentResponse = {
  order_id: string | null
  status: string
  message?: string
}

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null)
  const cartId = form?.get("cart_id")
  const receipt = form?.get("receipt")

  if (typeof cartId !== "string" || !cartId || !receipt || typeof receipt === "string") {
    return NextResponse.json(
      { message: "Choose a receipt file and try again." },
      { status: 400 },
    )
  }

  if (!ALLOWED_RECEIPT_TYPES.includes(receipt.type)) {
    return NextResponse.json(
      { message: "Receipt must be a PDF, JPG, PNG, or WEBP file." },
      { status: 415 },
    )
  }

  if (receipt.size > MAX_RECEIPT_SIZE) {
    return NextResponse.json(
      { message: "Receipt must be 5 MB or smaller." },
      { status: 413 },
    )
  }

  const body = new FormData()
  body.set("cart_id", cartId)
  body.set("receipt", receipt, receipt.name)

  try {
    const result = await sdk.client.fetch<ManualPaymentResponse>("/store/manual-payment", {
      method: "POST",
      body,
      headers: {
        ...(await getAuthHeaders()),
        "content-type": null,
      },
      cache: "no-store",
    })

    const response = NextResponse.json({
      order_id: result.order_id,
      status: result.status,
      message: result.message || MANUAL_PAYMENT_RECEIVED_MESSAGE,
    })

    response.cookies.delete("_medusa_cart_id")

    for (const tagName of ["carts", "orders"]) {
      const tag = await getCacheTag(tagName)

      if (tag) {
        revalidateTag(tag, { expire: 0 })
      }
    }

    return response
  } catch (error) {
    const status = typeof (error as { status?: unknown })?.status === "number"
      ? (error as { status: number }).status
      : 502

    return NextResponse.json(
      {
        message:
          status < 500
            ? (error as Error)?.message || "We couldn't submit your receipt."
            : "We couldn't submit your receipt. Please try again.",
      },
      { status },
    )
  }
}
