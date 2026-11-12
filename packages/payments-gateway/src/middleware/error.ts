import type { Context } from "hono"
import type { ErrorCode } from "../types.js"

type GatewayStatusCode = 200 | 400 | 401 | 403 | 404 | 409 | 422 | 429 | 500 | 502

const statusToCode = (status: number): ErrorCode => {
  if (status === 400) {
    return "validation_error"
  }
  if (status === 401) {
    return "unauthorized"
  }
  if (status === 403) {
    return "vendor_suspended"
  }
  if (status === 404) {
    return "not_found"
  }
  if (status === 409) {
    return "conflict"
  }
  if (status === 429) {
    return "rate_limited"
  }
  return "internal_error"
}

export const errorHandler = (error: Error, c: Context): Response => {
  const status =
    typeof error === "object" && error !== null && "status" in error
      ? Number((error as { status?: unknown }).status)
      : 500

  const code = (
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code)
      : undefined
  ) as ErrorCode | undefined

  const finalStatus = Number.isInteger(status) && status >= 400 && status < 600 ? status : 500
  const finalCode = code ?? statusToCode(finalStatus)

  return c.json(
    { error: { code: finalCode, message: error.message } },
    finalStatus as GatewayStatusCode,
  )
}
