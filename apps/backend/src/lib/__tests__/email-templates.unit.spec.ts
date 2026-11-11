import {
  escapeHtml,
  renderEmailTemplate,
  resolveTemplateKind,
  safeUrl,
} from "../email-templates"

describe("resolveTemplateKind", () => {
  it("maps provider template names to a kind", () => {
    expect(resolveTemplateKind("campaign-promotion")).toBe("promotion")
    expect(resolveTemplateKind("campaign-reminder")).toBe("reminder")
    expect(resolveTemplateKind("campaign-newsletter")).toBe("newsletter")
    expect(resolveTemplateKind("order-placed")).toBe("generic")
    expect(resolveTemplateKind("")).toBe("generic")
  })
})

describe("safeUrl", () => {
  it("keeps http and https urls", () => {
    expect(safeUrl("https://example.com/shop")).toBe("https://example.com/shop")
    expect(safeUrl("http://example.com")).toBe("http://example.com")
  })

  it("rejects javascript and relative urls", () => {
    expect(safeUrl("javascript:alert(1)")).toBeNull()
    expect(safeUrl("data:text/html,<script>")).toBeNull()
    expect(safeUrl("/relative")).toBeNull()
    expect(safeUrl(null)).toBeNull()
  })
})

describe("escapeHtml", () => {
  it("escapes markup characters", () => {
    expect(escapeHtml('<a href="x">Tom & Jerry</a>')).toBe(
      "&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&lt;/a&gt;"
    )
  })
})

describe("renderEmailTemplate", () => {
  it("renders a promotion with store defaults", () => {
    const email = renderEmailTemplate("campaign-promotion", {
      storeName: "Blessing store",
      recipientName: "Ada",
    })

    expect(email.subject).toBe("A special offer from Blessing store")
    expect(email.html).toContain("A special offer, just for you")
    expect(email.html).toContain("Blessing store")
    expect(email.html).toContain("Powered by Flowcheq Commerce")
    expect(email.text).toContain("A special offer, just for you")
  })

  it("personalises name and store placeholders", () => {
    const email = renderEmailTemplate("campaign-newsletter", {
      storeName: "Blessing store",
      recipientName: "Ada",
      subject: "{{name}}, news from {{store}}",
      heading: "Hello {{name}}",
      body: "{{name}}, {{store}} has new arrivals.",
    })

    expect(email.subject).toBe("Ada, news from Blessing store")
    expect(email.html).toContain("Hello Ada")
    expect(email.html).toContain("Ada, Blessing store has new arrivals.")
  })

  it("falls back to 'there' when the recipient name is missing", () => {
    const email = renderEmailTemplate("campaign-reminder", {
      storeName: "Blessing store",
      heading: "Hi {{name}}",
    })

    expect(email.html).toContain("Hi there")
  })

  it("escapes vendor supplied html", () => {
    const email = renderEmailTemplate("campaign-promotion", {
      storeName: "Blessing store",
      body: '<script>alert("xss")</script>',
      heading: "<b>Sale</b>",
    })

    expect(email.html).not.toContain("<script>")
    expect(email.html).toContain("&lt;script&gt;")
    expect(email.html).toContain("&lt;b&gt;Sale&lt;/b&gt;")
  })

  it("drops unsafe call to action urls", () => {
    const email = renderEmailTemplate("campaign-promotion", {
      storeName: "Blessing store",
      ctaLabel: "Claim now",
      ctaUrl: "javascript:alert(1)",
    })

    expect(email.html).not.toContain("javascript:")
    expect(email.html).not.toContain("Claim now")
  })

  it("renders a call to action button for http urls", () => {
    const email = renderEmailTemplate("campaign-promotion", {
      storeName: "Blessing store",
      ctaLabel: "Shop now",
      ctaUrl: "https://shop.example.com/sale",
    })

    expect(email.html).toContain('href="https://shop.example.com/sale"')
    expect(email.html).toContain("Shop now")
    expect(email.text).toContain("Shop now: https://shop.example.com/sale")
  })

  it("only embeds http images", () => {
    const email = renderEmailTemplate("campaign-newsletter", {
      storeName: "Blessing store",
      logoUrl: "https://cdn.example.com/logo.png",
      imageUrl: "javascript:alert(1)",
    })

    expect(email.html).toContain('src="https://cdn.example.com/logo.png"')
    expect(email.html).not.toContain("javascript:")
  })

  it("adds the unsubscribe link when one is provided", () => {
    const email = renderEmailTemplate("campaign-newsletter", {
      storeName: "Blessing store",
      unsubscribeUrl: "https://shop.example.com/unsubscribe?token=abc",
    })

    expect(email.html).toContain(
      'href="https://shop.example.com/unsubscribe?token=abc"'
    )
    expect(email.text).toContain(
      "Unsubscribe: https://shop.example.com/unsubscribe?token=abc"
    )
  })

  it("explains the audience when there is no unsubscribe link", () => {
    const email = renderEmailTemplate("campaign-newsletter", {
      storeName: "Blessing store",
    })

    expect(email.html).toContain(
      "You are receiving this email because you are a customer of Blessing store."
    )
  })

  it("includes contact details in the footer", () => {
    const email = renderEmailTemplate("campaign-newsletter", {
      storeName: "Blessing store",
      contactEmail: "hello@example.com",
      contactPhone: "+234 800 000 0000",
      address: "12 Marina Road\nLagos",
    })

    expect(email.html).toContain("hello@example.com")
    expect(email.html).toContain("+234 800 000 0000")
    expect(email.html).toContain("12 Marina Road, Lagos")
  })

  it("uses the brand colour only when it is a valid hex colour", () => {
    const valid = renderEmailTemplate("campaign-promotion", {
      storeName: "Blessing store",
      brandColor: "#123456",
      ctaUrl: "https://shop.example.com",
    })
    const invalid = renderEmailTemplate("campaign-promotion", {
      storeName: "Blessing store",
      brandColor: "red;background:url(x)",
      ctaUrl: "https://shop.example.com",
    })

    expect(valid.html).toContain("background:#123456")
    expect(invalid.html).toContain("background:#5B4FF9")
  })
})
