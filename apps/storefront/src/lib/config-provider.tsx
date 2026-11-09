"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

import { connectStoreSettingsSSE } from "@lib/store-settings-sse"
import type { StorefrontSettings } from "@flowcheq/storefront-config"

export type StoreConfig = {
  backendUrl: string
  publishableKey: string
  storeName: string
  primaryColor: string
  logoUrl?: string
  defaultCountryCode: string
  stripePublishableKey?: string
  medusaPaymentsPublishableKey?: string
  adyenClientKey?: string
  adyenEnvironment: "test" | "live"
  settings?: StorefrontSettings
}

const StoreConfigContext = createContext<StoreConfig | null>(null)

/**
 * Applies brand values from a settings event to the document so the storefront
 * re-themes itself live (CSS variables + data attributes) without a reload.
 */
const applySettingsToDocument = (settings: StorefrontSettings) => {
  const root = document.documentElement

  if (settings.brand?.primaryColor) {
    root.style.setProperty("--brand-primary", settings.brand.primaryColor)
  }

  if (settings.brand?.accentColor) {
    root.style.setProperty("--brand-accent", settings.brand.accentColor)
  }

  if (settings.theme?.mode) {
    root.dataset.mode = settings.theme.mode
  }

  if (settings.layout?.headerStyle) {
    root.dataset.headerStyle = settings.layout.headerStyle
  }

  if (settings.layout?.footerStyle) {
    root.dataset.footerStyle = settings.layout.footerStyle
  }
}

/**
 * Makes the tenant's runtime configuration available to client components.
 *
 * The initial values come from the root server layout. When staff save
 * storefront settings in the Medusa admin, the backend emits a
 * `storefront.settings.updated` event over SSE; this provider receives it,
 * merges the new values into the context and reapplies them to the document,
 * so the storefront re-brands itself live.
 */
export function ConfigProvider({
  config: initialConfig,
  children,
}: {
  config: StoreConfig
  children: ReactNode
}) {
  const [config, setConfig] = useState<StoreConfig>(initialConfig)
  const { backendUrl, publishableKey } = initialConfig

  useEffect(() => {
    if (!backendUrl || !publishableKey) {
      return undefined
    }

    const connection = connectStoreSettingsSSE(
      backendUrl,
      publishableKey,
      (event) => {
        const settings = event.settings

        setConfig((prev) => ({
          ...prev,
          storeName: settings.brand?.name ?? prev.storeName,
          primaryColor: settings.brand?.primaryColor ?? prev.primaryColor,
          logoUrl: settings.brand?.logoUrl ?? prev.logoUrl,
          settings: {
            ...(prev.settings ?? {}),
            ...settings,
          },
        }))

        applySettingsToDocument(settings)
      },
    )

    return () => connection.close()
  }, [backendUrl, publishableKey])

  return (
    <StoreConfigContext.Provider value={config}>
      {children}
    </StoreConfigContext.Provider>
  )
}

export function useStoreConfig(): StoreConfig {
  const config = useContext(StoreConfigContext)

  if (!config) {
    throw new Error("useStoreConfig must be used inside <ConfigProvider>")
  }

  return config
}
