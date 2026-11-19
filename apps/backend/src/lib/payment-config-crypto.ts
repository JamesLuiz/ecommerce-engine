import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto"

const ALGO = "aes-256-gcm"

function getKey(): Uint8Array {
  const secret =
    process.env.PAYMENT_CONFIG_SECRET ||
    process.env.SECRETS_ENCRYPTION_KEY ||
    process.env.JWT_SECRET ||
    process.env.COOKIE_SECRET

  if (!secret) {
    throw new Error(
      "A secret is required to encrypt payment configuration (set PAYMENT_CONFIG_SECRET, JWT_SECRET, or COOKIE_SECRET)."
    )
  }

  // Derive a stable 32-byte key from the configured secret.
  return new Uint8Array(createHash("sha256").update(secret).digest())
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0
  for (const part of parts) {
    result.set(part, offset)
    offset += part.length
  }
  return result
}

export function encryptSecret(value: string): string {
  const iv = new Uint8Array(randomBytes(12))
  const cipher = createCipheriv(ALGO, getKey(), iv)
  const encryptedPart = cipher.update(value, "utf8") as unknown as Uint8Array
  const encryptedFinal = cipher.final() as unknown as Uint8Array
  const ciphertext = concatBytes([encryptedPart, encryptedFinal])
  const tag = new Uint8Array(cipher.getAuthTag())
  const payload = concatBytes([iv, tag, ciphertext])
  return Buffer.from(payload).toString("base64")
}

export function decryptSecret(value: string): string {
  const raw = Buffer.from(value, "base64")
  const iv = new Uint8Array(raw.subarray(0, 12))
  const tag = new Uint8Array(raw.subarray(12, 28))
  const ciphertext = new Uint8Array(raw.subarray(28))
  const decipher = createDecipheriv(ALGO, getKey(), iv)
  decipher.setAuthTag(tag)
  const decryptedPart = decipher.update(ciphertext) as unknown as Uint8Array
  const decryptedFinal = decipher.final() as unknown as Uint8Array
  const plaintext = concatBytes([decryptedPart, decryptedFinal])
  return new TextDecoder().decode(plaintext)
}

export function maskSecret(value: string | null | undefined): string | null {
  if (!value) return null
  if (value.length <= 8) return "****"
  return `${value.slice(0, 4)}****${value.slice(-4)}`
}
