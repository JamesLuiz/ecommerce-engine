import { defineRouteConfig } from "@medusajs/admin-sdk"
import { EnvelopeSolid } from "@medusajs/icons"
import {
  Badge,
  Button,
  Container,
  Heading,
  Input,
  Label,
  Prompt,
  Select,
  Skeleton,
  Text,
  Textarea,
  toast,
} from "@medusajs/ui"
import { useCallback, useEffect, useMemo, useState } from "react"

type CampaignKind = "promotion" | "reminder" | "newsletter"

type CampaignDraft = {
  kind: CampaignKind
  subject: string
  heading: string
  body: string
  ctaLabel: string
  ctaUrl: string
  imageUrl: string
}

type MessagesStatus = {
  configured: boolean
  fromEmail: string
  fromName: string
  storeName: string
  audience: { customers: number }
  recent: Array<{
    id: string
    to: string
    template: string
    status: "pending" | "success" | "failure"
    createdAt: string
    campaignId: string | null
  }>
}

type PreviewPayload = { subject: string; html: string }

const EMPTY_DRAFT: CampaignDraft = {
  kind: "promotion",
  subject: "",
  heading: "",
  body: "",
  ctaLabel: "",
  ctaUrl: "",
  imageUrl: "",
}

const KINDS: Array<{ value: CampaignKind; label: string; hint: string }> = [
  {
    value: "promotion",
    label: "Promotion",
    hint: "Announce a sale, discount or limited offer.",
  },
  {
    value: "reminder",
    label: "Reminder",
    hint: "Nudge customers about something they left behind.",
  },
  {
    value: "newsletter",
    label: "Newsletter",
    hint: "Share new arrivals, stories and store updates.",
  },
]

const newCampaignId = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }

  return `campaign-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

const splitEmails = (value: string): string[] =>
  Array.from(
    new Set(
      value
        .split(/[\s,;]+/)
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean)
    )
  )

const statusColor = (
  status: MessagesStatus["recent"][number]["status"]
): "green" | "red" | "grey" =>
  status === "success" ? "green" : status === "failure" ? "red" : "grey"

const MessagesPage = () => {
  const [status, setStatus] = useState<MessagesStatus | null>(null)
  const [statusError, setStatusError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [draft, setDraft] = useState<CampaignDraft>(EMPTY_DRAFT)
  const [previewName, setPreviewName] = useState("Ada")
  const [audience, setAudience] = useState<"customers" | "custom">("customers")
  const [emailsInput, setEmailsInput] = useState("")
  const [preview, setPreview] = useState<PreviewPayload | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [campaignId, setCampaignId] = useState(newCampaignId)

  const loadStatus = useCallback(async () => {
    setStatusError(null)

    try {
      const response = await fetch("/admin/messages", {
        credentials: "same-origin",
      })

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`)
      }

      setStatus((await response.json()) as MessagesStatus)
    } catch (error) {
      setStatusError((error as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadStatus()
  }, [loadStatus])

  useEffect(() => {
    if (!draft.subject.trim() || !draft.body.trim()) {
      setPreview(null)
      setPreviewError(null)
      return
    }

    let cancelled = false
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setPreviewLoading(true)
      setPreviewError(null)

      try {
        const response = await fetch("/admin/messages/preview", {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ ...draft, previewName }),
          signal: controller.signal,
        })
        const payload = (await response.json().catch(() => null)) as
          | (PreviewPayload & { message?: string })
          | null

        if (!response.ok) {
          throw new Error(payload?.message ?? "Preview failed")
        }

        if (!cancelled) {
          setPreview(payload)
        }
      } catch (error) {
        if (!cancelled && (error as Error).name !== "AbortError") {
          setPreviewError((error as Error).message)
        }
      } finally {
        if (!cancelled) {
          setPreviewLoading(false)
        }
      }
    }, 450)

    return () => {
      cancelled = true
      controller.abort()
      clearTimeout(timer)
    }
  }, [draft, previewName])

  const updateDraft = (patch: Partial<CampaignDraft>) =>
    setDraft((current) => ({ ...current, ...patch }))

  const recipientEmails = useMemo(() => splitEmails(emailsInput), [emailsInput])

  const recipientCount =
    audience === "customers"
      ? status?.audience.customers ?? 0
      : recipientEmails.length

  const canSend =
    Boolean(status?.configured) &&
    draft.subject.trim().length > 0 &&
    draft.body.trim().length > 0 &&
    recipientCount > 0

  const handleSend = async () => {
    if (sending) {
      return
    }

    setSending(true)

    try {
      const response = await fetch("/admin/messages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          campaignId,
          kind: draft.kind,
          subject: draft.subject.trim(),
          heading: draft.heading.trim() || undefined,
          body: draft.body.trim(),
          ctaLabel: draft.ctaLabel.trim() || undefined,
          ctaUrl: draft.ctaUrl.trim() || undefined,
          imageUrl: draft.imageUrl.trim() || undefined,
          audience,
          recipientEmails: audience === "custom" ? recipientEmails : [],
        }),
      })
      const payload = (await response.json().catch(() => null)) as {
        message?: string
        sent?: number
        failed?: number
      } | null

      if (!response.ok) {
        throw new Error(payload?.message ?? `Send failed with ${response.status}`)
      }

      toast.success("Campaign sent", {
        description: `${payload?.sent ?? 0} sent, ${payload?.failed ?? 0} failed.`,
      })
      setCampaignId(newCampaignId())
      loadStatus()
    } catch (error) {
      toast.error("Campaign failed", {
        description: (error as Error).message,
      })
    } finally {
      setSending(false)
    }
  }

  const kindHint = KINDS.find((kind) => kind.value === draft.kind)?.hint ?? ""

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gap: 4 }}>
        <Heading level="h1">Messages</Heading>
        <Text size="small" style={{ color: "var(--fg-subtle)" }}>
          Email your customers about promotions, reminders and news.
        </Text>
      </div>

      {loading && !status ? (
        <Skeleton style={{ height: 240, borderRadius: 8 }} />
      ) : null}

      {statusError ? (
        <Container style={{ padding: 16 }}>
          <Text size="small">{statusError}</Text>
        </Container>
      ) : null}

      {status && !status.configured ? (
        <Container style={{ padding: 18 }}>
          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "flex-start",
              flexWrap: "wrap",
            }}
          >
            <Badge color="orange">Setup required</Badge>
            <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
              <Text size="small" weight="plus">
                Brevo is not configured
              </Text>
              <Text size="small" style={{ color: "var(--fg-subtle)" }}>
                Add BREVO_API_KEY and BREVO_FROM_EMAIL to the backend
                environment, then restart it. You can still compose and preview
                emails below.
              </Text>
            </div>
          </div>
        </Container>
      ) : null}

      <div
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
          alignItems: "start",
        }}
      >
        <Container style={{ padding: 20 }}>
          <div style={{ display: "grid", gap: 14 }}>
            <div style={{ display: "grid", gap: 6 }}>
              <Label htmlFor="campaign-kind">Template</Label>
              <Select
                value={draft.kind}
                onValueChange={(value) =>
                  updateDraft({ kind: value as CampaignKind })
                }
              >
                <Select.Trigger id="campaign-kind">
                  <Select.Value placeholder="Template" />
                </Select.Trigger>
                <Select.Content>
                  {KINDS.map((kind) => (
                    <Select.Item key={kind.value} value={kind.value}>
                      {kind.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
              <Text size="xsmall" style={{ color: "var(--fg-muted)" }}>
                {kindHint}
              </Text>
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              <Label htmlFor="campaign-subject">Subject</Label>
              <Input
                id="campaign-subject"
                value={draft.subject}
                onChange={(event) =>
                  updateDraft({ subject: event.target.value })
                }
                placeholder="A special offer from {{store}}"
                maxLength={160}
              />
              <Text size="xsmall" style={{ color: "var(--fg-muted)" }}>
                Use {"{{name}}"} and {"{{store}}"} to personalise the email.
              </Text>
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              <Label htmlFor="campaign-heading">Headline</Label>
              <Input
                id="campaign-heading"
                value={draft.heading}
                onChange={(event) =>
                  updateDraft({ heading: event.target.value })
                }
                placeholder="Optional. Defaults to the template headline."
                maxLength={160}
              />
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              <Label htmlFor="campaign-body">Message</Label>
              <Textarea
                id="campaign-body"
                value={draft.body}
                onChange={(event) => updateDraft({ body: event.target.value })}
                placeholder="Write the message your customers will read."
                rows={8}
                maxLength={5000}
              />
              <Text size="xsmall" style={{ color: "var(--fg-muted)" }}>
                Leave a blank line between paragraphs.
              </Text>
            </div>

            <div
              style={{
                display: "grid",
                gap: 12,
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              }}
            >
              <div style={{ display: "grid", gap: 6 }}>
                <Label htmlFor="campaign-cta-label">Button label</Label>
                <Input
                  id="campaign-cta-label"
                  value={draft.ctaLabel}
                  onChange={(event) =>
                    updateDraft({ ctaLabel: event.target.value })
                  }
                  placeholder="Shop the offer"
                  maxLength={80}
                />
              </div>
              <div style={{ display: "grid", gap: 6 }}>
                <Label htmlFor="campaign-cta-url">Button link</Label>
                <Input
                  id="campaign-cta-url"
                  value={draft.ctaUrl}
                  onChange={(event) =>
                    updateDraft({ ctaUrl: event.target.value })
                  }
                  placeholder="https://your-store.com/sale"
                />
              </div>
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              <Label htmlFor="campaign-image">Header image URL</Label>
              <Input
                id="campaign-image"
                value={draft.imageUrl}
                onChange={(event) =>
                  updateDraft({ imageUrl: event.target.value })
                }
                placeholder="Optional. https://..."
              />
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              <Label htmlFor="campaign-audience">Audience</Label>
              <Select
                value={audience}
                onValueChange={(value) =>
                  setAudience(value as "customers" | "custom")
                }
              >
                <Select.Trigger id="campaign-audience">
                  <Select.Value placeholder="Audience" />
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value="customers">
                    All customers
                  </Select.Item>
                  <Select.Item value="custom">Specific emails</Select.Item>
                </Select.Content>
              </Select>
            </div>

            {audience === "custom" ? (
              <div style={{ display: "grid", gap: 6 }}>
                <Label htmlFor="campaign-emails">Recipient emails</Label>
                <Textarea
                  id="campaign-emails"
                  value={emailsInput}
                  onChange={(event) => setEmailsInput(event.target.value)}
                  placeholder="ada@example.com, grace@example.com"
                  rows={4}
                />
                <Text size="xsmall" style={{ color: "var(--fg-muted)" }}>
                  Separate addresses with commas or new lines. Use this to send
                  a test to yourself first.
                </Text>
              </div>
            ) : null}

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
                borderTop: "1px solid var(--border-base)",
                paddingTop: 14,
              }}
            >
              <Text size="small" style={{ color: "var(--fg-subtle)" }}>
                {recipientCount} recipient{recipientCount === 1 ? "" : "s"}
                {status?.fromEmail ? ` - from ${status.fromEmail}` : ""}
              </Text>
              <Button
                onClick={() => setConfirmOpen(true)}
                disabled={!canSend || sending}
                isLoading={sending}
              >
                Send campaign
              </Button>
            </div>
          </div>
        </Container>

        <Container style={{ padding: 20 }}>
          <div style={{ display: "grid", gap: 10 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <Text size="base" weight="plus">
                Preview
              </Text>
              <Input
                value={previewName}
                onChange={(event) => setPreviewName(event.target.value)}
                placeholder="Preview name"
                style={{ maxWidth: 160 }}
              />
            </div>

            {previewError ? (
              <Text size="small" style={{ color: "var(--fg-error)" }}>
                {previewError}
              </Text>
            ) : null}

            {preview ? (
              <>
                <Text size="xsmall" style={{ color: "var(--fg-subtle)" }}>
                  Subject
                </Text>
                <Text size="small" weight="plus">
                  {preview.subject}
                </Text>
                <iframe
                  title="Email preview"
                  srcDoc={preview.html}
                  sandbox=""
                  style={{
                    width: "100%",
                    height: 520,
                    border: "1px solid var(--border-base)",
                    borderRadius: 8,
                    background: "#FFFFFF",
                  }}
                />
              </>
            ) : (
              <div
                style={{
                  height: 320,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px dashed var(--border-base)",
                  borderRadius: 8,
                }}
              >
                <Text size="small" style={{ color: "var(--fg-muted)" }}>
                  {previewLoading
                    ? "Rendering preview..."
                    : "Add a subject and message to see the preview."}
                </Text>
              </div>
            )}
          </div>
        </Container>
      </div>

      <Container style={{ padding: 20 }}>
        <div style={{ display: "grid", gap: 12 }}>
          <Text size="base" weight="plus">
            Recent sends
          </Text>

          {status?.recent.length ? (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  minWidth: 560,
                }}
              >
                <thead>
                  <tr>
                    {["Recipient", "Template", "Status", "Sent at"].map(
                      (heading) => (
                        <th
                          key={heading}
                          style={{
                            textAlign: "left",
                            padding: "8px",
                            fontSize: 12,
                            fontWeight: 500,
                            color: "var(--fg-subtle)",
                          }}
                        >
                          {heading}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {status.recent.map((item) => (
                    <tr
                      key={item.id}
                      style={{ borderTop: "1px solid var(--border-base)" }}
                    >
                      <td style={{ padding: "10px 8px" }}>
                        <Text size="small">{item.to}</Text>
                      </td>
                      <td style={{ padding: "10px 8px" }}>
                        <Text
                          size="small"
                          style={{ color: "var(--fg-subtle)" }}
                        >
                          {item.template}
                        </Text>
                      </td>
                      <td style={{ padding: "10px 8px" }}>
                        <Badge size="2xsmall" color={statusColor(item.status)}>
                          {item.status}
                        </Badge>
                      </td>
                      <td style={{ padding: "10px 8px" }}>
                        <Text
                          size="small"
                          style={{ color: "var(--fg-subtle)" }}
                        >
                          {new Date(item.createdAt).toLocaleString()}
                        </Text>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Text size="small" style={{ color: "var(--fg-muted)" }}>
              No campaigns sent yet.
            </Text>
          )}
        </div>
      </Container>

      <Prompt open={confirmOpen} onOpenChange={setConfirmOpen}>
        <Prompt.Content>
          <Prompt.Header>
            <Prompt.Title>Send this campaign?</Prompt.Title>
            <Prompt.Description>
              This will email {recipientCount} recipient
              {recipientCount === 1 ? "" : "s"}. It cannot be undone.
            </Prompt.Description>
          </Prompt.Header>
          <Prompt.Footer>
            <Prompt.Cancel>Cancel</Prompt.Cancel>
            <Prompt.Action onClick={handleSend} disabled={sending}>
              Send now
            </Prompt.Action>
          </Prompt.Footer>
        </Prompt.Content>
      </Prompt>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Messages",
  icon: EnvelopeSolid,
  rank: 20,
})

export default MessagesPage
