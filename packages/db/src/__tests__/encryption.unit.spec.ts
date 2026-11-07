import { beforeEach, describe, expect, it } from "vitest"
import { randomBytes } from "node:crypto"
import { decrypt, encrypt, generateSecret } from "../encryption"

const KEY = randomBytes(32)

function withKey<T>(fn: () => T): T {
  const previous = process.env.SECRETS_ENCRYPTION_KEY
  process.env.SECRETS_ENCRYPTION_KEY = KEY.toString("hex")
  try {
    return fn()
  } finally {
    if (previous === undefined) {
      delete process.env.SECRETS_ENCRYPTION_KEY
    } else {
      process.env.SECRETS_ENCRYPTION_KEY = previous
    }
  }
}

describe("encrypt/decrypt", () => {
  beforeEach(() => {
    delete process.env.SECRETS_ENCRYPTION_KEY
  })

  it("round-trips a value", () => {
    withKey(() => {
      expect(decrypt(encrypt("tenant-secret"))).toBe("tenant-secret")
    })
  })

  it("produces different ciphertexts for the same plaintext", () => {
    withKey(() => {
      expect(encrypt("same")).not.toBe(encrypt("same"))
    })
  })

  it("fails to decrypt tampered ciphertext", () => {
    withKey(() => {
      const token = encrypt("tenant-secret")
      const tampered = Buffer.from(token, "base64")
      tampered[0] = tampered[0] === 0 ? 1 : 0
      expect(() => decrypt(tampered.toString("base64"))).toThrow()
    })
  })

  it("rejects a missing key", () => {
    delete process.env.SECRETS_ENCRYPTION_KEY

    expect(() => encrypt("tenant-secret")).toThrow()
    expect(() => decrypt(generateSecret())).toThrow()
  })
})

describe("generateSecret", () => {
  it("returns a hex string of 64 characters", () => {
    expect(generateSecret()).toMatch(/^[a-f0-9]{64}$/)
  })
})
