import { Metadata } from "next"

import FeaturedProducts from "@modules/home/components/featured-products"
import Hero from "@modules/home/components/hero"
import { listCollections } from "@lib/data/collections"
import { listProducts } from "@lib/data/products"
import { getRegion, listRegions } from "@lib/data/regions"
import { toJsonLd } from "@lib/util/product-structured-data"
import { getRuntimeConfig } from "@lib/runtime-config"
import { getSiteOrigin, listCountryCodes, STORE_NAME } from "@lib/util/site"
import { buildRegionsReturnPolicies } from "@lib/util/store-policies"
import ProductPreview from "@modules/products/components/product-preview"

export const dynamic = "force-dynamic"

export async function generateMetadata(props: {
  params: Promise<{ countryCode: string }>
}): Promise<Metadata> {
  const { countryCode } = await props.params
  const [origin, regions] = await Promise.all([getSiteOrigin(), listRegions()])

  // Resolve the store name from the live settings (metadata.storefront) so
  // the page title reflects tenant customisation instead of the env default.
  let storeName = STORE_NAME
  try {
    const runtime = getRuntimeConfig()
    const response = await fetch(
      `${runtime.backendUrl.replace(/\/$/, "")}/store/store-brand`,
      {
        cache: "no-store",
        headers: {
          ...(runtime.publishableKey
            ? { "x-publishable-api-key": runtime.publishableKey }
            : {}),
        },
      }
    )
    if (response.ok) {
      const payload = (await response.json()) as {
        brand?: { name?: string }
        settings?: { brand?: { name?: string } }
        hasStorefrontSettings?: boolean
      }
      const settingsBrand = payload.settings?.brand ?? {}
      const hasSettings = Boolean(payload.hasStorefrontSettings)
      storeName =
        hasSettings && settingsBrand.name
          ? settingsBrand.name
          : payload.brand?.name || STORE_NAME
    }
  } catch {
    // Keep the env-default title if the backend is unreachable.
  }

  return {
    title: storeName,
    description: `Shop online at ${storeName}.`,
    alternates: {
      canonical: `${origin}/${countryCode}`,
      languages: {
        ...Object.fromEntries(
          listCountryCodes(regions).map((code) => [
            `en-${code.toUpperCase()}`,
            `${origin}/${code}`,
          ])
        ),
        "x-default": origin,
      },
    },
  }
}

export default async function Home(props: {
  params: Promise<{ countryCode: string }>
}) {
  const params = await props.params

  const { countryCode } = params

  const region = await getRegion(countryCode)

  const { collections } = await listCollections({
    fields: "id, handle, title",
  })

  if (!region) {
    return null
  }

  const [{ response: featuredProducts }, { response: newArrivals }] = await Promise.all([
    listProducts({
      regionId: region.id,
      queryParams: {
        limit: 4,
        fields: "*variants.calculated_price,+metadata",
      },
    }),
    listProducts({
      regionId: region.id,
      queryParams: {
        limit: 4,
        fields: "*variants.calculated_price,+metadata",
      },
    }),
  ])

  const sortedNewArrivals = [...newArrivals.products].sort(
    (a, b) =>
      new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
  )

  const [origin, regions] = await Promise.all([getSiteOrigin(), listRegions()])
  const homeUrl = `${origin}/${countryCode}`
  const returnPolicies = buildRegionsReturnPolicies(regions)
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: STORE_NAME,
      url: origin,
      ...(returnPolicies.length
        ? { hasMerchantReturnPolicy: returnPolicies }
        : {}),
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: STORE_NAME,
      url: homeUrl,
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${homeUrl}/search?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
  ]

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLd(structuredData) }}
      />
      <Hero />

      {featuredProducts.products.length > 0 && (
        <section className="content-container py-16 sm:py-20">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.22em] text-neutral-500">
                Shop the edit
              </p>
              <h2 className="text-3xl font-semibold tracking-[-0.06em] text-neutral-900">
                Featured products
              </h2>
            </div>
          </div>

          <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {featuredProducts.products.slice(0, 4).map((product) => (
              <li key={product.id}>
                <ProductPreview product={product} region={region} isFeatured />
              </li>
            ))}
          </ul>
        </section>
      )}

      {sortedNewArrivals.length > 0 && (
        <section className="content-container pb-16 sm:pb-20">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.22em] text-neutral-500">
                Fresh arrivals
              </p>
              <h2 className="text-3xl font-semibold tracking-[-0.06em] text-neutral-900">
                New arrivals
              </h2>
            </div>
          </div>

          <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {sortedNewArrivals.slice(0, 4).map((product) => (
              <li key={product.id}>
                <ProductPreview product={product} region={region} isFeatured />
              </li>
            ))}
          </ul>
        </section>
      )}

      {collections && collections.length > 0 && (
        <div className="py-12">
          <ul className="flex flex-col gap-x-6">
            <FeaturedProducts collections={collections} region={region} />
          </ul>
        </div>
      )}
    </>
  )
}
