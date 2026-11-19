"use client"

import { useState } from "react"

import { Text } from "@modules/common/components/ui"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useStoreConfig } from "@lib/config-provider"
import StoreBrand from "@modules/layout/components/store-brand"
import { resolveContactLinks } from "@flowcheq/storefront-config"

/**
 * The tenant footer: the store mark, contact methods (WhatsApp, Facebook, X,
 * Instagram, TikTok, Email, or custom links picked in Settings → Storefront),
 * legal links, newsletter signup, and powered-by.
 *
 * Contact info is read from the live runtime config context so it updates
 * when staff save storefront settings and the backend pushes them over SSE.
 */

const KIND_BADGES: Record<string, string> = {
  whatsapp: "WA",
  facebook: "f",
  twitter: "X",
  instagram: "IG",
  tiktok: "TT",
  email: "@",
  custom: "→",
}

function NewsletterSignup() {
  const { settings } = useStoreConfig()

  if (!settings?.features?.newsletterEnabled) {
    return null
  }

  return <NewsletterForm />
}

function NewsletterForm() {
  const [email, setEmail] = useState("")
  const [done, setDone] = useState(false)

  return (
    <div className="max-w-xs">
      <Text className="text-ui-fg-base txt-small font-semibold">
        Stay in the loop
      </Text>
      <Text className="text-ui-fg-subtle txt-small mt-1">
        New drops and offers, straight to your inbox.
      </Text>
      {done ? (
        <Text className="txt-small mt-3 text-ui-fg-base">
          You are on the list. Welcome!
        </Text>
      ) : (
        <form
          className="mt-3 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            if (email.trim()) {
              setDone(true)
            }
          }}
        >
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email address"
            className="h-10 w-full rounded-full border border-ui-border-base bg-transparent px-4 text-sm text-ui-fg-base placeholder:text-ui-fg-muted focus:outline-none"
          />
          <button
            type="submit"
            className="h-10 shrink-0 rounded-full bg-ui-fg-base px-4 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Join
          </button>
        </form>
      )}
    </div>
  )
}

export default function Footer() {
  const { settings } = useStoreConfig()
  const poweredBy = settings?.footer?.poweredBy !== false
  const methods = resolveContactLinks(settings?.footer?.socials)
  const legal = settings?.footer?.legal ?? []
  const copyright =
    settings?.footer?.copyright ||
    `© ${new Date().getFullYear()} ${settings?.brand?.name ?? ""}`.trim()

  return (
    <footer className="border-t border-ui-border-base w-full">
      <div className="content-container flex flex-col w-full">
        <div className="flex flex-col gap-y-10 xsmall:flex-row items-start justify-between py-16">
          <div className="flex flex-col gap-y-6">
            <StoreBrand />
            {methods.length > 0 && (
              <ul className="flex flex-wrap gap-2">
                {methods.map((method, index) => {
                  const badge = KIND_BADGES[method.kind] ?? "→"
                  const inner = (
                    <>
                      <span
                        aria-hidden
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-ui-fg-base text-[10px] font-bold text-white"
                      >
                        {badge}
                      </span>
                      <span>{method.label}</span>
                    </>
                  )
                  return (
                    <li key={`${method.kind}-${method.label}-${index}`}>
                      {method.href ? (
                        <LocalizedClientLink
                          href={method.href}
                          className="flex items-center gap-2 rounded-full border border-ui-border-base px-3 py-1.5 text-sm text-ui-fg-subtle transition-colors hover:border-ui-fg-base hover:text-ui-fg-base"
                        >
                          {inner}
                        </LocalizedClientLink>
                      ) : (
                        <span className="flex items-center gap-2 rounded-full border border-ui-border-base px-3 py-1.5 text-sm text-ui-fg-subtle">
                          {inner}
                        </span>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <div className="flex flex-wrap gap-10 md:gap-x-16">

            {legal.length > 0 && (
              <div className="text-small-regular flex flex-col gap-y-2">
                <Text className="text-ui-fg-base txt-small font-semibold">
                  Legal
                </Text>
                {legal.map((item) => (
                  <LocalizedClientLink
                    key={`${item.label}-${item.href}`}
                    className="hover:text-ui-fg-base text-ui-fg-subtle"
                    href={item.href}
                  >
                    {item.label}
                  </LocalizedClientLink>
                ))}
              </div>
            )}

            <NewsletterSignup />
          </div>
        </div>

        <div className="mb-16 flex w-full flex-wrap items-center justify-between gap-x-6 gap-y-2 text-ui-fg-muted">
          {copyright ? (
            <Text className="txt-compact-small">{copyright}</Text>
          ) : null}
          {poweredBy && (
            <LocalizedClientLink
              href="/platform"
              className="txt-compact-small text-ui-fg-base hover:text-ui-fg-subtle transition-colors"
            >
              Powered by Flowcheq Commerce
            </LocalizedClientLink>
          )}
        </div>
      </div>
    </footer>
  )
}
