import { Metadata } from "next"

import { getStoreName } from "@lib/util/site"
import { PlaceholderNotice, PolicyPage } from "@modules/policies/templates"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Terms of service",
  description: `Terms that apply to purchases from ${getStoreName()}.`,
}

export default function TermsPage() {
  return (
    <PolicyPage title="Terms of service">
      <PlaceholderNotice />
      <p>
        By placing an order with {getStoreName()} you agree to these terms. Prices,
        product availability and shipping options are shown on the product
        pages and at checkout, and may change without notice.
      </p>
      <p>
        Orders are confirmed by email once payment is received. Returns and
        refunds are handled according to our return policy.
      </p>
    </PolicyPage>
  )
}
