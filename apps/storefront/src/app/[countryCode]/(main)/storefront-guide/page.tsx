import { Metadata } from "next"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Storefront customization guide",
  description:
    "A tour of every modifiable storefront section and how to change it from the backend admin.",
}

type Section = {
  id: string
  title: string
  whereOnStorefront: string
  changeInBackend: string[]
  tips?: string[]
}

const sections: Section[] = [
  {
    id: "header-brand",
    title: "Header & store brand",
    whereOnStorefront:
      "Top navigation bar: store logo/monogram, store name, menu, search, account, and cart.",
    changeInBackend: [
      "Go to Admin → Settings → Storefront → Branding to set Store name, Tagline, Vendor name, Logo URL (or upload), and brand colors/font/corners.",
      "Go to Admin → Settings → Storefront → Media to upload a logo image and assign it as Logo.",
      "Go to Admin → Settings → Storefront → Navigation & features to adjust feature toggles such as search/account/locale/country selectors (where supported).",
      "Save storefront settings to publish changes live.",
    ],
    tips: [
      "A clear logo and store name help customers recognize your brand immediately.",
    ],
  },
  {
    id: "announcement-navigation",
    title: "Announcement bar & navigation links",
    whereOnStorefront:
      "Promotional/notice bar (when enabled) and navigation/menu links used to guide shoppers around the store.",
    changeInBackend: [
      "Go to Admin → Settings → Storefront → Navigation & features.",
      "Enable and edit the Announcement bar text and optional CTA label/link.",
      "Add or edit Navigation links (label and destination path such as /store, /account, or custom pages).",
      "Save storefront settings.",
    ],
  },
  {
    id: "homepage-hero",
    title: "Homepage hero",
    whereOnStorefront:
      "The main banner at the top of the homepage with eyebrow, title/heading, description, and call-to-action buttons.",
    changeInBackend: [
      "Go to Admin → Settings → Storefront → Home.",
      "Enable the hero and update Hero eyebrow, title, heading, description, and Primary/Secondary CTA labels.",
      "Set a Hero image URL or upload an image in Media and assign it as Hero.",
      "You can also toggle hero visibility in Theme & layout (Show homepage hero).",
      "Save storefront settings.",
    ],
  },
  {
    id: "homepage-showcase",
    title: "Homepage featured card (showcase)",
    whereOnStorefront:
      "The highlighted card shown beside the hero featuring a product/promotion with badge, title, price, image, and link.",
    changeInBackend: [
      "Go to Admin → Settings → Storefront → Home.",
      "Enable the featured card and edit label, badge, eyebrow, title, price, image, and link.",
      "Upload/select an image in Media and assign it as Featured for quick reuse.",
      "Point the card link to /store, a collection, or a specific product page depending on what you sell.",
      "Save storefront settings.",
    ],
  },
  {
    id: "featured-new-arrivals",
    title: "Featured products & new arrivals",
    whereOnStorefront:
      "Homepage product grids showing featured items and recently added products (when available).",
    changeInBackend: [
      "Go to Admin → Products to create/edit products, add images, set prices, variants, and inventory.",
      "Publish products so they appear in the storefront catalog.",
      "Use Settings → Storefront → Home / Theme & layout to control featured/homepage product section visibility where applicable.",
      "Save settings and refresh the homepage; sections populate based on your catalog.",
    ],
    tips: [
      "Add clear product photos, names, and prices so these sections look rich and trustworthy.",
      "Tailor which products you publish/highlight to match what you sell.",
    ],
  },
  {
    id: "collections-categories",
    title: "Collections & categories",
    whereOnStorefront:
      "Curated collection rails on the homepage and dedicated collection/category browsing pages.",
    changeInBackend: [
      "Go to Admin → Collections to create collections and assign products to them.",
      "Go to Admin → Categories to organize your catalog for category browsing.",
      "Ensure products are published and have images/prices for the best presentation.",
      "Customers can browse via store, collection, and category pages once content exists.",
    ],
  },
  {
    id: "product-pages",
    title: "Product pages",
    whereOnStorefront:
      "Individual product detail pages with images, description, variants/options, price, and add-to-cart.",
    changeInBackend: [
      "Go to Admin → Products and open a product to edit its title, description, media, options/variants, prices, and inventory.",
      "Organize products into collections/categories for easier discovery.",
      "Save/publish product changes; the storefront reflects catalog updates.",
    ],
  },
  {
    id: "cart-checkout-account",
    title: "Cart, checkout, and customer account",
    whereOnStorefront:
      "Shopping cart, checkout flow, order confirmation, and customer account/order history pages.",
    changeInBackend: [
      "Configure Regions, Shipping options, and Payment providers in Admin so customers can complete purchases.",
      "Manage products, pricing, and inventory in Admin to keep availability accurate.",
      "View and fulfill orders in Admin → Orders after customers check out.",
      "Storefront branding/theme settings also apply around these flows for a consistent experience.",
    ],
  },
  {
    id: "footer-contact",
    title: "Footer, contact & legal",
    whereOnStorefront:
      "Footer area with contact details, social links, legal links, copyright, and powered-by attribution.",
    changeInBackend: [
      "Go to Admin → Settings → Storefront → Footer & contact.",
      "Update contact email/phone/address/hours, add social and legal links, edit copyright, and toggle powered-by.",
      "Save storefront settings.",
    ],
  },
  {
    id: "theme-seo",
    title: "Theme, colors, and SEO",
    whereOnStorefront:
      "Global colors, typography feel, layout styles, and page metadata/social sharing previews.",
    changeInBackend: [
      "Go to Admin → Settings → Storefront → Branding and Theme & layout to adjust colors, fonts, corner radius, mode, layout design, and layout styles.",
      "Pick a Storefront layout (Minimal, Aurora, Luxe Noire, Streetline, Brutalist, Breeze, Ember, Terra, Chrome, Pop Candy) to re-skin the whole storefront — same products and content, brand-new design.",
      "Go to Admin → Settings → Storefront → SEO to set default title, title template, description, keywords, and social image.",
      "Go to Admin → Settings → Storefront → Media to upload and assign a social/OG image.",
      "Save storefront settings.",
    ],
  },
]

export default function StorefrontGuidePage() {
  return (
    <div className="content-container py-10 sm:py-14">
      <div className="mx-auto max-w-4xl">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-neutral-500">
          Storefront guide
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.06em] text-neutral-900 sm:text-5xl">
          Customize every section of your storefront
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-neutral-600">
          This tour shows each modifiable storefront section and exactly how to change it from the
          backend admin. Most visual and content settings are in{" "}
          <span className="font-medium text-neutral-900">Admin → Settings → Storefront</span>, while
          products, collections, and categories are managed in their catalog areas.
        </p>

        <div className="mt-10 grid gap-5">
          {sections.map((section, index) => (
            <section
              key={section.id}
              id={section.id}
              className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm sm:p-7"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500">
                    {String(index + 1).padStart(2, "0")}
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-neutral-900">
                    {section.title}
                  </h2>
                </div>
              </div>

              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <div>
                  <h3 className="text-sm font-semibold text-neutral-900">On the storefront</h3>
                  <p className="mt-2 text-sm leading-6 text-neutral-600">
                    {section.whereOnStorefront}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-neutral-900">Change it from the backend</h3>
                  <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm leading-6 text-neutral-600">
                    {section.changeInBackend.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                </div>
              </div>

              {section.tips?.length ? (
                <div className="mt-5 rounded-xl bg-[#f5f3ef] p-4">
                  <h3 className="text-sm font-semibold text-neutral-900">Tips</h3>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-neutral-600">
                    {section.tips.map((tip) => (
                      <li key={tip}>{tip}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-black/5 bg-neutral-900 p-6 text-white sm:p-8">
          <h2 className="text-2xl font-semibold tracking-[-0.04em]">Quick start</h2>
          <ul className="mt-4 space-y-2 text-sm leading-6 text-white/80">
            <li>1. Open <span className="font-medium text-white">Settings → Storefront</span> in the backend and save your brand, home, footer, and SEO defaults.</li>
            <li>2. Add products, images, prices, and collections so featured/new arrivals/collection sections reflect what you sell.</li>
            <li>3. Configure payments, regions, and shipping so checkout works end to end.</li>
          </ul>
          <div className="mt-6 flex flex-wrap gap-3">
            <LocalizedClientLink
              href="/store"
              className="inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-medium text-neutral-900"
            >
              View store
            </LocalizedClientLink>
            <LocalizedClientLink
              href="/"
              className="inline-flex items-center justify-center rounded-full border border-white/20 px-5 py-2.5 text-sm font-medium text-white"
            >
              Back to home
            </LocalizedClientLink>
          </div>
        </div>
      </div>
    </div>
  )
}
