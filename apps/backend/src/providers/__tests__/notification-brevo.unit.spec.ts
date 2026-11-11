import { Modules } from "@medusajs/framework/utils"

import BrevoModule, { BrevoNotificationService } from "../notification-brevo"

const options = {
  apiKey: "xkeysib-test",
  fromEmail: "no-reply@example.com",
  fromName: "Blessing store",
  channels: ["email"],
}

const createService = () =>
  new BrevoNotificationService(
    { logger: { error: jest.fn() } as never },
    options
  )

describe("Brevo notification provider", () => {
  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
    jest.restoreAllMocks()
  })

  it("exports the Medusa ModuleProvider shape expected by the loader", () => {
    expect(BrevoModule.module).toBe(Modules.NOTIFICATION)
    expect(Array.isArray(BrevoModule.services)).toBe(true)
    expect(BrevoNotificationService.identifier).toBe("brevo")
  })

  it("requires an api key and a sender email", () => {
    expect(() =>
      BrevoNotificationService.validateOptions({
        fromEmail: "no-reply@example.com",
      })
    ).toThrow("BREVO_API_KEY")

    expect(() =>
      BrevoNotificationService.validateOptions({ apiKey: "xkeysib-test" })
    ).toThrow("BREVO_FROM_EMAIL")
  })

  it("sends a rendered template through the Brevo API", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ messageId: "<abc@brevo>" }),
    })
    global.fetch = fetchMock as unknown as typeof fetch

    const service = createService()
    const result = await service.send({
      to: "customer@example.com",
      channel: "email",
      template: "campaign-promotion",
      data: {
        storeName: "Blessing store",
        recipientName: "Ada",
        heading: "Hello {{name}}",
        ctaUrl: "https://shop.example.com/sale",
      },
    })

    expect(result).toEqual({ id: "<abc@brevo>" })
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe("https://api.brevo.com/v3/smtp/email")
    expect(init.method).toBe("POST")
    expect(init.headers["api-key"]).toBe("xkeysib-test")
    expect(init.headers["content-type"]).toBe("application/json")

    const body = JSON.parse(init.body)
    expect(body.sender).toEqual({
      email: "no-reply@example.com",
      name: "Blessing store",
    })
    expect(body.to).toEqual([{ email: "customer@example.com" }])
    expect(body.subject).toBe("A special offer from Blessing store")
    expect(body.htmlContent).toContain("Hello Ada")
    expect(body.textContent).toContain("Hello Ada")
    expect(body.htmlContent).toContain("Ada")
  })

  it("prefers pre-rendered content over the template", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({}),
    })
    global.fetch = fetchMock as unknown as typeof fetch

    const service = createService()
    const result = await service.send({
      to: "customer@example.com",
      channel: "email",
      template: "campaign-newsletter",
      content: {
        subject: "Ready made subject",
        html: "<p>Ready made body</p>",
        text: "Ready made body",
      },
    })

    expect(result).toEqual({})

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.subject).toBe("Ready made subject")
    expect(body.htmlContent).toBe("<p>Ready made body</p>")
  })

  it("passes cc, bcc, reply-to and tags from provider data", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({}),
    })
    global.fetch = fetchMock as unknown as typeof fetch

    const service = createService()
    await service.send({
      to: "customer@example.com",
      channel: "email",
      template: "campaign-newsletter",
      provider_data: {
        cc: "owner@example.com",
        bcc: ["audit@example.com", "not-an-email"],
        replyTo: "support@example.com",
        tags: ["campaign", 42],
      },
    })

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.cc).toEqual([{ email: "owner@example.com" }])
    expect(body.bcc).toEqual([{ email: "audit@example.com" }])
    expect(body.replyTo).toEqual({ email: "support@example.com" })
    expect(body.tags).toEqual(["campaign"])
  })

  it("throws with the Brevo error message on a rejected send", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ code: "invalid_parameter", message: "Invalid sender" }),
    }) as unknown as typeof fetch

    const service = createService()

    await expect(
      service.send({
        to: "customer@example.com",
        channel: "email",
        template: "campaign-newsletter",
      })
    ).rejects.toThrow("Invalid sender")
  })

  it("throws when the network request fails", async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error("socket hang up")) as unknown as typeof fetch

    const service = createService()

    await expect(
      service.send({
        to: "customer@example.com",
        channel: "email",
        template: "campaign-newsletter",
      })
    ).rejects.toThrow("socket hang up")
  })

  it("rejects an invalid recipient", async () => {
    const service = createService()

    await expect(
      service.send({
        to: "not-an-email",
        channel: "email",
        template: "campaign-newsletter",
      })
    ).rejects.toThrow("valid recipient email")
  })
})
