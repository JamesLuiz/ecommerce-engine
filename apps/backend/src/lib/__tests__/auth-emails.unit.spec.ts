import {
  ADMIN_INVITE_PATH,
  ADMIN_RESET_PATH,
  adminBaseUrl,
  buildInviteData,
  buildPasswordResetData,
  inviteLink,
  resetLink,
  tokenFingerprint,
} from "../auth-emails"

describe("adminBaseUrl", () => {
  const previous = process.env.MEDUSA_ADMIN_BACKEND_URL

  afterEach(() => {
    if (previous === undefined) {
      delete process.env.MEDUSA_ADMIN_BACKEND_URL
    } else {
      process.env.MEDUSA_ADMIN_BACKEND_URL = previous
    }
  })

  it("falls back to the local backend", () => {
    delete process.env.MEDUSA_ADMIN_BACKEND_URL

    expect(adminBaseUrl()).toBe("http://localhost:9000")
  })

  it("trims whitespace and strips trailing slashes", () => {
    process.env.MEDUSA_ADMIN_BACKEND_URL =
      "https://admin-acme.example.store/// "

    expect(adminBaseUrl()).toBe("https://admin-acme.example.store")
  })
})

describe("auth links", () => {
  it("builds the invite link", () => {
    process.env.MEDUSA_ADMIN_BACKEND_URL = "https://admin-acme.example.store"

    expect(inviteLink("abc123")).toBe(
      `https://admin-acme.example.store${ADMIN_INVITE_PATH}?token=abc123`
    )
  })

  it("builds the reset link and encodes the token", () => {
    process.env.MEDUSA_ADMIN_BACKEND_URL = "https://admin-acme.example.store"

    expect(resetLink("a+b/c")).toBe(
      `https://admin-acme.example.store${ADMIN_RESET_PATH}?token=${encodeURIComponent("a+b/c")}`
    )
  })

  it("fingerprints tokens deterministically without exposing them", () => {
    const first = tokenFingerprint("token-a")
    const second = tokenFingerprint("token-a")

    expect(first).toBe(second)
    expect(first).toHaveLength(12)
    expect(first).not.toContain("token-a")
    expect(tokenFingerprint("token-b")).not.toBe(first)
  })
})

describe("auth email data", () => {
  it("builds the password reset email", () => {
    const data = buildPasswordResetData({
      storeName: "Acme",
      email: "owner@acme.test",
      actionUrl: "https://admin-acme.example.store/app/reset-password?token=x",
    })

    expect(data.subject).toBe("Reset your password - Acme")
    expect(data.ctaLabel).toBe("Choose a new password")
    expect(data.ctaUrl).toContain("/app/reset-password?token=")
  })

  it("builds the invite email", () => {
    const data = buildInviteData({
      storeName: "Acme",
      email: "owner@acme.test",
      actionUrl: "https://admin-acme.example.store/app/invite?token=x",
    })

    expect(data.subject).toBe("You are invited to manage Acme")
    expect(data.ctaLabel).toBe("Accept invite")
    expect(data.ctaUrl).toContain("/app/invite?token=")
  })
})
