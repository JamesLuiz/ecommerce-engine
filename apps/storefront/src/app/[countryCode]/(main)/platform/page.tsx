import { Metadata } from "next"

import { getStoreName } from "@lib/util/site"
import { PolicyPage } from "@modules/policies/templates"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "About Flowcheq Commerce",
  description:
    "Flowcheq Commerce is a privately owned ecommerce engine that powers this store.",
}

export default function PlatformPage() {
  const storeName = getStoreName()

  return (
    <PolicyPage title="About Flowcheq Commerce">
      <p>
        {storeName} runs on Flowcheq Commerce, a privately owned ecommerce
        engine built to serve businesses in the ecommerce industry.
      </p>
      <p>
        Flowcheq Commerce brings the storefront you are browsing, the product
        catalog and checkout, the store administration tools, and the payment
        infrastructure together in one platform. Instead of stitching several
        services together, each business gets a complete store that is ready to
        sell.
      </p>

      <h2 className="text-xl-semi">Built for businesses</h2>
      <p>
        Every store on Flowcheq Commerce is isolated: its own catalog, orders,
        customers, staff accounts and branding. That lets a business run its
        storefront on its own domain while sharing the same reliable engine for
        checkout, payments and operations.
      </p>
      <ul className="list-disc pl-6 flex flex-col gap-2">
        <li>
          Storefronts that can be branded and changed without redeploying code.
        </li>
        <li>
          A complete admin for products, orders, customers, regions and
          promotions.
        </li>
        <li>Secure payments with settlement handled by the platform.</li>
        <li>Managed hosting, databases, domains and upgrades for each store.</li>
      </ul>

      <h2 className="text-xl-semi">What that means for you</h2>
      <p>
        When you shop with {storeName}, your order is handled by the business
        behind this store. Flowcheq Commerce provides the technology and keeps
        the checkout, payment and order systems running, so the business can
        focus on its products and customers.
      </p>
    </PolicyPage>
  )
}
