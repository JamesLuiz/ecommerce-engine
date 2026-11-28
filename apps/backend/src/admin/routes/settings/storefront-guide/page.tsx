import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text } from "@medusajs/ui"

type GuideSection = {
  id: string
  title: string
  location: string
  description: string
  howTo: string[]
  notes?: string[]
}

const sections: GuideSection[] = [
  {
    id: "brand",
    title: "Brand & identity",
    location: "Settings → Storefront → Branding",
    description:
      "Controls your store name, tagline, description, vendor name, logo, favicon, colors, font, and corner radius. These values shape the header brand, overall look, and theme colors across the storefront.",
    howTo: [
      "Open Settings → Storefront and select the Branding tab.",
      "Update Store name, Tagline, Store description, and Vendor full name as needed.",
      "Set Logo URL or upload a logo file. You can also upload/manage images in the Media tab and assign one as the logo.",
      "Choose Brand primary color and Brand accent color using the color pickers.",
      "Select Brand font and Corner radius to match your style.",
      "Click Save storefront settings. Changes are published to the live storefront.",
    ],
    notes: [
      "The logo and store name appear in the storefront header and other branded areas.",
      "Primary/accent colors are applied as theme variables so the storefront can re-theme live.",
    ],
  },
  {
    id: "theme-layout",
    title: "Theme & layout",
    location: "Settings → Storefront → Theme & layout",
    description:
      "Controls theme mode, the switchable storefront layout design, header and footer styles, and whether key homepage sections are shown.",
    howTo: [
      "Open Settings → Storefront → Theme & layout.",
      "Choose Theme mode (Light, Dark, or System) and pick a Storefront layout: Minimal, Aurora, Luxe Noire, Streetline, Brutalist, Breeze, Ember, Terra, Chrome, Pop Candy, Air, Titanium, or Liquid Glass.",
      "Select Header style and Footer style.",
      "Toggle Show homepage hero and Show featured products on homepage to control homepage composition.",
      "Save storefront settings — the storefront re-skins itself instantly with the new design, same products and content rearranged.",
    ],
    notes: [
      "Each layout rearranges the same homepage sections (hero, featured card, product grids, collection rails) with its own product-card shapes, palette, and animations.",
      "Your words, sections, and product data never change — only how they are presented.",
    ],
  },
  {
    id: "home-hero",
    title: "Homepage hero",
    location: "Settings → Storefront → Home",
    description:
      "The main hero banner at the top of the homepage: eyebrow, title, heading, description, call-to-action labels, and hero image.",
    howTo: [
      "Open Settings → Storefront → Home.",
      "Enable the homepage hero and fill in Hero eyebrow, Hero title, Hero heading, and Hero description.",
      "Set Primary CTA and Secondary CTA labels to guide shoppers (for example, Shop now / Browse all).",
      "Add a Hero image URL, or upload an image in Media and assign it as Hero.",
      "Save storefront settings and view the homepage to confirm.",
    ],
    notes: [
      "If hero content is empty, the storefront may fall back to sensible defaults; saving explicit content keeps your storefront looking complete.",
    ],
  },
  {
    id: "home-showcase",
    title: "Homepage featured card (showcase)",
    location: "Settings → Storefront → Home",
    description:
      "The highlighted product/promo card shown alongside the hero with label, badge, title, price, image, and link.",
    howTo: [
      "Open Settings → Storefront → Home.",
      "Enable “Show the featured card beside the hero”.",
      "Set Card label, badge, eyebrow, title, and price text.",
      "Provide a Card image URL or assign an uploaded image from Media as Featured.",
      "Set Card link (for example /store or a specific product/collection path) so shoppers can click through.",
      "Save storefront settings.",
    ],
  },
  {
    id: "home-catalog-sections",
    title: "Featured products, new arrivals, and collections",
    location: "Products, Collections, and Categories in Admin; Settings → Storefront → Home/Theme & layout",
    description:
      "Homepage product sections are driven by your catalog. Featured products and new arrivals grids appear when products exist; collection rails appear for published collections.",
    howTo: [
      "Add and publish products in Products so they can appear on the storefront.",
      "Create collections in Collections and assign products to them to show curated collection rails on the homepage and collection pages.",
      "Organize products with Categories to improve browsing and category pages.",
      "Use Settings → Storefront → Home to enable featured products display where available, and Theme & layout to toggle homepage featured sections.",
      "Save changes and refresh the storefront homepage.",
    ],
    notes: [
      "The more complete your catalog (titles, images, prices, inventory), the richer these storefront sections will look.",
      "“Depending on the products you sell”, prioritize adding the products/collections you want customers to see first.",
    ],
  },
  {
    id: "navigation-features",
    title: "Navigation & features",
    location: "Settings → Storefront → Navigation & features",
    description:
      "Configures navigation links, announcement bar content, and storefront feature toggles such as search, account, locale/country selectors, WhatsApp, and newsletter options.",
    howTo: [
      "Open Settings → Storefront → Navigation & features.",
      "Add, edit, or remove Navigation links (label and href/path).",
      "Configure the Announcement bar: enable it (it shows on every layout theme), set text plus optional CTA label and href, then pick a style — Standard, Sale, or Countdown offer — and set a countdown end date or hours for countdown offers.",
      "Toggle storefront features (search, account, locale selector, country selector, WhatsApp button, newsletter signup) as needed.",
      "Enter a WhatsApp number if WhatsApp contact is enabled.",
      "Save storefront settings.",
    ],
    notes: [
      "Feature availability on the live storefront depends on how the theme consumes these settings; saved values remain editable in the backend.",
    ],
  },
  {
    id: "footer-contact",
    title: "Footer & contact",
    location: "Settings → Storefront → Footer & contact",
    description:
      "Controls footer contact methods, legal links, copyright text, and whether the powered-by attribution is shown.",
    howTo: [
      "Open Settings → Storefront → Footer & contact.",
      "Add Contact methods (pick WhatsApp, Facebook, X, Instagram, TikTok, Email, or a custom link) and Legal links (label and href).",
      "Set Copyright text and toggle Show powered by if desired.",
      "Save storefront settings.",
    ],
    notes: [
      "Contact methods are rendered as clickable chips in the storefront footer; WhatsApp entries also power the floating chat button when enabled under Navigation & features.",
    ],
  },
  {
    id: "media",
    title: "Media library",
    location: "Settings → Storefront → Media (and Branding/Home/SEO fields)",
    description:
      "Upload and manage storefront images (logo, favicon, hero, featured card, social/OG, general). Uploaded assets are stored and can be reused across settings.",
    howTo: [
      "Open Settings → Storefront → Media.",
      "Choose an Asset type, select one or more image files, and upload.",
      "Use the action buttons on an asset to assign it as Logo, Hero, Featured card image, or Social image.",
      "Alternatively paste image URLs directly in Branding, Home, or SEO fields.",
      "Delete unused assets if needed, then save storefront settings after making assignments.",
    ],
    notes: [
      "Media uploads persist in backend storage/database records so they remain available after restarts.",
    ],
  },
  {
    id: "seo",
    title: "SEO & sharing",
    location: "Settings → Storefront → SEO",
    description:
      "Sets default SEO title/description, title template, keywords, and social sharing (Open Graph) image.",
    howTo: [
      "Open Settings → Storefront → SEO.",
      "Enter Default title, Title template, Default description, and Keywords (comma-separated).",
      "Set Social image URL or assign an uploaded image from Media.",
      "Save storefront settings.",
    ],
    notes: [
      "Search engines and social previews may take time to reflect updates after changes are published.",
    ],
  },
  {
    id: "payments",
    title: "Payments (Paystack)",
    location: "Payments (sidebar) or Settings area depending on your admin navigation",
    description:
      "Configures how customers pay at checkout: platform gateway mode or your own Paystack account (direct mode), including keys and webhook/callback details.",
    howTo: [
      "Open the Payments page in the admin.",
      "Choose Platform gateway (managed) or Use your own Paystack (direct), then enable payments.",
      "For direct mode, enter your Paystack public/secret keys (leave secret blank to keep an existing value) and copy the provided Webhook URL and Callback URL into your Paystack dashboard.",
      "Save payment settings and run a test checkout in the storefront.",
    ],
    notes: [
      "Platform-mode transaction history/settlement shown in admin applies to the platform gateway; direct-mode reconciliation is done in your Paystack dashboard.",
    ],
  },
]

const StorefrontGuidePage = () => {
  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "24px" }}>
      <div style={{ marginBottom: 24 }}>
        <Heading level="h1">Storefront customization guide</Heading>
        <Text size="small" className="text-ui-fg-subtle" style={{ marginTop: 8 }}>
          A tour of every modifiable storefront section and how to change it from the backend.
          Most visual/content settings live in <strong>Settings → Storefront</strong>; catalog
          sections (products, collections, categories) are managed in their respective admin areas.
        </Text>
      </div>

      <div style={{ display: "grid", gap: 16 }}>
        {sections.map((section, index) => (
          <Container key={section.id} style={{ padding: 20 }}>
            <div style={{ display: "grid", gap: 10 }}>
              <div>
                <Text size="xsmall" className="text-ui-fg-subtle">
                  {String(index + 1).padStart(2, "0")} · {section.location}
                </Text>
                <Heading level="h2" style={{ marginTop: 4 }}>
                  {section.title}
                </Heading>
              </div>

              <Text size="small">{section.description}</Text>

              <div>
                <Text size="small" weight="plus">
                  How to change it
                </Text>
                <ol style={{ margin: "8px 0 0 18px", display: "grid", gap: 6 }}>
                  {section.howTo.map((step) => (
                    <li key={step}>
                      <Text size="small" className="text-ui-fg-subtle">
                        {step}
                      </Text>
                    </li>
                  ))}
                </ol>
              </div>

              {section.notes?.length ? (
                <div>
                  <Text size="small" weight="plus">
                    Notes
                  </Text>
                  <ul style={{ margin: "8px 0 0 18px", display: "grid", gap: 6 }}>
                    {section.notes.map((note) => (
                      <li key={note}>
                        <Text size="small" className="text-ui-fg-subtle">
                          {note}
                        </Text>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </Container>
        ))}
      </div>

      <Container style={{ padding: 20, marginTop: 16 }}>
        <Heading level="h2">Quick checklist</Heading>
        <ul style={{ margin: "10px 0 0 18px", display: "grid", gap: 6 }}>
          <li>
            <Text size="small" className="text-ui-fg-subtle">
              Save <strong>Settings → Storefront</strong> after edits to publish branding, layout, home, footer, and SEO changes.
            </Text>
          </li>
          <li>
            <Text size="small" className="text-ui-fg-subtle">
              Add products, images, prices, and collections so homepage and store pages don’t look empty for your catalog.
            </Text>
          </li>
          <li>
            <Text size="small" className="text-ui-fg-subtle">
              Configure Payments and regions/shipping so customers can complete checkout.
            </Text>
          </li>
        </ul>
      </Container>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Storefront guide",
})

export default StorefrontGuidePage
