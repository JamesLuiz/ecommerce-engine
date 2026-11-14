"use client"

import { Text } from "@modules/common/components/ui"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useStoreConfig } from "@lib/config-provider"
import StoreBrand from "@modules/layout/components/store-brand"

/**
 * The tenant footer: the store mark, their contact details, and
 * "Powered by Flowcheq Commerce". All Medusa branding (categories,
 * collections, customer service, Medusa links, MedusaCTA) is removed.
 *
 * Contact info is read from the live runtime config context so it updates
 * when staff save storefront settings and the backend pushes them over SSE.
 */
export default function Footer() {
  const { settings } = useStoreConfig()
  const contact = settings?.footer?.contact ?? {
    email: "",
    phone: "",
    address: "",
    hours: "",
  }
  const poweredBy = settings?.footer?.poweredBy !== false

  const contactItems = [
    { label: contact.email, href: contact.email ? `mailto:${contact.email}` : undefined },
    { label: contact.phone, href: contact.phone ? `tel:${contact.phone}` : undefined },
    ...(contact.address ? [{ label: contact.address, href: undefined }] : []),
    ...(contact.hours ? [{ label: contact.hours, href: undefined }] : []),
  ]

  return (
    <footer className="border-t border-ui-border-base w-full">
      <div className="content-container flex flex-col w-full">
        <div className="flex flex-col gap-y-6 xsmall:flex-row items-start justify-between py-40">
          <StoreBrand />

          {contactItems.length > 0 && (
            <div className="text-small-regular gap-10 md:gap-x-16 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
              {contactItems.map((item, index) => (
                <div key={String(item.label) + index} className="flex flex-col gap-y-2">
                  {item.href ? (
                    <LocalizedClientLink
                      className="hover:text-ui-fg-base"
                      href={item.href}
                    >
                      {item.label}
                    </LocalizedClientLink>
                  ) : (
                    <Text className="text-ui-fg-subtle txt-small">
                      {item.label}
                    </Text>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex w-full mb-16 justify-between text-ui-fg-muted">
          <Text className="txt-compact-small" />
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
