import { ConfigProvider } from "@lib/config-provider"
import { getRuntimeConfig } from "@lib/runtime-config"
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

export default function RootLayout(props: { children: React.ReactNode }) {
  const runtime = getRuntimeConfig()
  const brandStyle = {
    "--brand-primary": runtime.primaryColor,
  } as CSSProperties

  return (
    <html lang="en" data-mode="light" style={brandStyle}>
      <head>
        <link rel="ucp" href="/.well-known/ucp" />
      </head>
      <body>
        <ConfigProvider
          config={{
            backendUrl: runtime.backendUrl,
            publishableKey: runtime.publishableKey,
            storeName: runtime.storeName,
            primaryColor: runtime.primaryColor,
            logoUrl: runtime.logoUrl,
            defaultCountryCode: runtime.defaultCountryCode,
            stripePublishableKey: runtime.stripePublishableKey,
            medusaPaymentsPublishableKey:
              runtime.medusaPaymentsPublishableKey,
            adyenClientKey: runtime.adyenClientKey,
            adyenEnvironment: runtime.adyenEnvironment,
          }}
        >
          <main className="relative">{props.children}</main>
        </ConfigProvider>
      </body>
    </html>
  )
}
