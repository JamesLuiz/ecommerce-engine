import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Get your own online store | Flowcheq Commerce",
  description:
    "A dedicated online store with a product catalogue, orders, online payments, inventory and an admin dashboard. Set up for your business in 24 hours.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" style={{ ["--brand-primary" as string]: "#111111" }}>
      <body className="antialiased">{children}</body>
    </html>
  )
}
