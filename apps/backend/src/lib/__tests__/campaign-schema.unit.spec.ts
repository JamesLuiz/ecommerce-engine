import {
  campaignPreviewSchema,
  campaignSendSchema,
  splitRecipientEmails,
} from "../campaign-schema"

const draft = {
  kind: "promotion" as const,
  subject: "A special offer",
  body: "Come back and see what is new.",
}

describe("campaignSendSchema", () => {
  it("accepts a minimal campaign to all customers", () => {
    const parsed = campaignSendSchema.parse(draft)

    expect(parsed.audience).toBe("customers")
    expect(parsed.recipientEmails).toEqual([])
    expect(parsed.ctaUrl).toBeUndefined()
  })

  it("rejects a campaign without a subject or body", () => {
    expect(() =>
      campaignSendSchema.parse({ ...draft, subject: "  " })
    ).toThrow()
    expect(() => campaignSendSchema.parse({ ...draft, body: "" })).toThrow()
  })

  it("requires recipients when the audience is custom", () => {
    const result = campaignSendSchema.safeParse({
      ...draft,
      audience: "custom",
      recipientEmails: [],
    })

    expect(result.success).toBe(false)

    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["recipientEmails"])
    }
  })

  it("rejects malformed recipient emails", () => {
    expect(() =>
      campaignSendSchema.parse({
        ...draft,
        audience: "custom",
        recipientEmails: ["not-an-email"],
      })
    ).toThrow()
  })

  it("only accepts http(s) call to action urls", () => {
    expect(() =>
      campaignSendSchema.parse({ ...draft, ctaUrl: "javascript:alert(1)" })
    ).toThrow()

    const parsed = campaignSendSchema.parse({
      ...draft,
      ctaUrl: "https://shop.example.com/sale",
    })

    expect(parsed.ctaUrl).toBe("https://shop.example.com/sale")
  })

  it("turns an empty call to action url into undefined", () => {
    const parsed = campaignSendSchema.parse({ ...draft, ctaUrl: "" })

    expect(parsed.ctaUrl).toBeUndefined()
  })

  it("validates the retry campaign id", () => {
    expect(() =>
      campaignSendSchema.parse({ ...draft, campaignId: "no spaces allowed" })
    ).toThrow()

    const parsed = campaignSendSchema.parse({
      ...draft,
      campaignId: "3f8a2c1e-4b7d-4e2a-9c1f-1a2b3c4d5e6f",
    })

    expect(parsed.campaignId).toBe("3f8a2c1e-4b7d-4e2a-9c1f-1a2b3c4d5e6f")
  })
})

describe("campaignPreviewSchema", () => {
  it("accepts a preview name and keeps the draft optional fields", () => {
    const parsed = campaignPreviewSchema.parse({
      ...draft,
      previewName: "Ada",
      heading: "Hello {{name}}",
    })

    expect(parsed.previewName).toBe("Ada")
    expect(parsed.heading).toBe("Hello {{name}}")
  })
})

describe("splitRecipientEmails", () => {
  it("splits, lowercases and de-duplicates addresses", () => {
    expect(
      splitRecipientEmails("Ada@Example.com, grace@example.com\nADA@example.com")
    ).toEqual(["ada@example.com", "grace@example.com"])
  })

  it("returns an empty array for blank input", () => {
    expect(splitRecipientEmails("  \n , ")).toEqual([])
  })
})
