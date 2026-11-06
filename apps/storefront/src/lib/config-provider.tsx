"use client"

import { createContext, useContext, type ReactNode } from "react"

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
}

const StoreConfigContext = createContext<StoreConfig | null>(null)

/**
 * Makes the tenant's runtime configuration available to client components.
 * The values come from the root server layout, which reads the container's
 * environment per request.
 */
export function ConfigProvider({
  config,
  children,
}: {
  config: StoreConfig
  children: ReactNode
}) {
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
