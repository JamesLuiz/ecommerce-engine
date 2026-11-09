import { ConfigProvider } from "@lib/config-provider"
import { getRuntimeConfig, hydrateRuntimeBrandConfig } from "@lib/runtime-config"
import { Metadata } from "next"
import type { CSSProperties } from "react"
import "styles/globals.css"

/**
 * The storefront must never be statically optimised at build time: the same
 * image is started for every tenant and reads its backend URL, key and brand
 * from the container environment on each request.
 */
export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.STORE_BASE_URL || "https://localhost:8000"
  ),
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const runtime = getRuntimeConfig()
  const hydratedRuntime = await hydrateRuntimeBrandConfig()
  const brandStyle = {
    "--brand-primary": hydratedRuntime.primaryColor,
  } as CSSProperties

  return (
    <html lang="en" data-mode="light" style={brandStyle}>
      <head>
        <link rel="ucp" href="/.well-known/ucp" />
      </head>
      <body>
        <ConfigProvider
          config={{
            backendUrl: hydratedRuntime.backendUrl,
            publishableKey: hydratedRuntime.publishableKey,
            storeName: hydratedRuntime.storeName,
            primaryColor: hydratedRuntime.primaryColor,
            logoUrl: hydratedRuntime.logoUrl,
            defaultCountryCode: hydratedRuntime.defaultCountryCode,
            stripePublishableKey: hydratedRuntime.stripePublishableKey,
            medusaPaymentsPublishableKey:
              hydratedRuntime.medusaPaymentsPublishableKey,
            adyenClientKey: hydratedRuntime.adyenClientKey,
            adyenEnvironment: hydratedRuntime.adyenEnvironment,
          }}
        >
          <main className="relative">{props.children}</main>
        </ConfigProvider>
      </body>
    </html>
  )
}
