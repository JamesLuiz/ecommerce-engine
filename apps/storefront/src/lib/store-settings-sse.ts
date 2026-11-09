import type { StorefrontSettings } from "@flowcheq/storefront-config"

export type StoreSettingsEvent = {
  type: "storefront.settings.updated"
  settings: StorefrontSettings
  updatedAt: string
}

/**
 * Connects to the storefront settings SSE stream and invokes `onEvent`
 whenever staff save storefront settings in the Medusa admin.
 *
 * Uses `fetch` + `ReadableStream` instead of `EventSource` so the publishable
 * API key can be sent as a request header (EventSource cannot set headers).
 * The connection reconnects with a short backoff when it closes or errors.
 */
export function connectStoreSettingsSSE(
  backendUrl: string,
  publishableKey: string,
  onEvent: (event: StoreSettingsEvent) => void,
) {
  let controller: AbortController | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null

  const url = `${backendUrl.replace(/\/$/, "")}/store/storefront-settings/stream`

  const start = () => {
    controller = new AbortController()

    fetch(url, {
      headers: {
        Accept: "text/event-stream",
        ...(publishableKey
          ? { "x-publishable-api-key": publishableKey }
          : {}),
      },
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok || !response.body) {
          throw new Error(`SSE stream returned ${response.status}`)
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ""

        const pump = () =>
          reader
            .read()
            .then(({ done, value }) => {
              if (done) {
                return
              }

              buffer += decoder.decode(value, { stream: true })
              const parts = buffer.split("\n")
              buffer = parts.pop() ?? ""

              for (const part of parts) {
                const line = part.trim()
                if (line.startsWith("data: ")) {
                  try {
                    const event = JSON.parse(line.slice("data: ".length))
                    if (
                      event &&
                      event.type === "storefront.settings.updated" &&
                      event.settings
                    ) {
                      onEvent(event as StoreSettingsEvent)
                    }
                  } catch {
                    // Malformed SSE payloads are skipped.
                  }
                }
              }

              return pump()
            })
            .catch(() => {
              // Stream ended or errored: nothing to do here, reconnect handles it.
            })

        pump()
      })
      .catch(() => {
        // Connection failed: schedule a reconnect.
        scheduleReconnect()
      })
  }

  const scheduleReconnect = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
    }

    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      start()
    }, 3000)
  }

  const close = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }

    controller?.abort()
    controller = null
  }

  start()

  return { close, reconnect: () => { close(); start() } }
}
