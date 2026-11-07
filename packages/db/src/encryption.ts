import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto"

const ALGO = "aes-256-gcm"

function key(): Uint8Array {
  const keyHex = process.env.SECRETS_ENCRYPTION_KEY

  if (!keyHex) {
    throw new Error("SECRETS_ENCRYPTION_KEY is required to encrypt tenant secrets.")
  }

  const keyBytes = Buffer.from(keyHex, "hex")

  if (keyBytes.length !== 32) {
    throw new Error("SECRETS_ENCRYPTION_KEY must be 64 hex characters (32 bytes).")
  }

  return Uint8Array.from(keyBytes)
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

export function encrypt(value: string): string {
  const iv = new Uint8Array(randomBytes(12))
  const cipher = createCipheriv(ALGO, key(), iv)
  const encryptedPart = cipher.update(value, "utf8") as unknown as Uint8Array
  const encryptedFinal = cipher.final() as unknown as Uint8Array
  const ciphertext = concatBytes([encryptedPart, encryptedFinal])
  const tag = new Uint8Array(cipher.getAuthTag())
  const payload = concatBytes([iv, tag, ciphertext])

  return Buffer.from(payload).toString("base64")
}

export function decrypt(value: string): string {
  const raw = Buffer.from(value, "base64")
  const iv = new Uint8Array(raw.subarray(0, 12))
  const tag = new Uint8Array(raw.subarray(12, 28))
  const ciphertext = new Uint8Array(raw.subarray(28))

  const decipher = createDecipheriv(ALGO, key(), iv)
  decipher.setAuthTag(tag)
  const decryptedPart = decipher.update(ciphertext) as unknown as Uint8Array
  const decryptedFinal = decipher.final() as unknown as Uint8Array
  const plaintext = concatBytes([decryptedPart, decryptedFinal])

  return new TextDecoder().decode(plaintext)
}

export function generateSecret(): string {
  return randomBytes(32).toString("hex")
}
