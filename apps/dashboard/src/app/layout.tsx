import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Flowcheq Commerce",
  description: "Control-plane dashboard for Flowcheq Commerce tenant stores.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
