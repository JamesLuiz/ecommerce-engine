import { Metadata } from "next"

import { getStoreName } from "@lib/util/site"
import { PlaceholderNotice, PolicyPage } from "@modules/policies/templates"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Contact",
  description: `How to contact ${getStoreName()}.`,
}

export default function ContactPage() {
  return (
    <PolicyPage title="Contact">
      <PlaceholderNotice />
      <p>
        Questions about an order, shipping or returns? Contact {getStoreName()}{" "}
        customer service and include your order number.
      </p>
    </PolicyPage>
  )
}
