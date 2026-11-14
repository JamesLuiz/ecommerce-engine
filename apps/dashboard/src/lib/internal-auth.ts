import { timingSafeEqual } from "node:crypto"

/**
 * Compares the request Authorization bearer token with a shared secret in
 * constant time. Returns false when the secret is not configured so a missing
 * env var can never open an internal endpoint.
 */
export function hasValidBearerToken(request: Request, secret: string | undefined): boolean {
  if (!secret) {
    return false
  }

  const header = request.headers.get("authorization") ?? ""
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : ""
  const provided = new Uint8Array(Buffer.from(token))
  const expected = new Uint8Array(Buffer.from(secret))

  if (provided.length !== expected.length) {
    return false
  }

  return timingSafeEqual(provided, expected)
}
