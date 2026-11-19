import { Metadata } from "next"

import { listCollections } from "@lib/data/collections"
import { listProducts } from "@lib/data/products"
import { getRegion, listRegions } from "@lib/data/regions"
import { toJsonLd } from "@lib/util/product-structured-data"
import { getRuntimeConfig } from "@lib/runtime-config"
import { getSiteOrigin, getStoreName, listCountryCodes } from "@lib/util/site"
import { buildRegionsReturnPolicies } from "@lib/util/store-policies"
import ThemedHome from "@modules/themes/home"
import type { CollectionBlock } from "@modules/themes/registry"

export const dynamic = "force-dynamic"

export async function generateMetadata(props: {
params: Promise<{ countryCode: string }>
}): Promise<Metadata> {
const { countryCode } = await props.params
const [origin, regions] = await Promise.all([getSiteOrigin(), listRegions()])

// Resolve the store name from the live settings (metadata.storefront) so
// the page title reflects tenant customisation instead of the env default.
let storeName = getStoreName()
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
: payload.brand?.name || getStoreName()
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

// Collection rails: priced products per collection for the themed layouts.
const blocks: CollectionBlock[] = await Promise.all(
(collections ?? []).slice(0, 4).map(async (collection) => {
try {
const { response } = await listProducts({
regionId: region.id,
queryParams: {
collection_id: collection.id,
limit: 4,
fields: "*variants.calculated_price",
},
})
return { collection, products: response.products ?? [] }
} catch {
return { collection, products: [] }
}
})
)

const [origin, regions] = await Promise.all([getSiteOrigin(), listRegions()])
const homeUrl = `${origin}/${countryCode}`
const returnPolicies = buildRegionsReturnPolicies(regions)
const currentStoreName = getStoreName()
const structuredData = [
{
"@context": "https://schema.org",
"@type": "Organization",
name: currentStoreName,
url: origin,
...(returnPolicies.length
? { hasMerchantReturnPolicy: returnPolicies }
: {}),
},
{
"@context": "https://schema.org",
"@type": "WebSite",
name: currentStoreName,
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
<ThemedHome
featured={featuredProducts.products ?? []}
arrivals={sortedNewArrivals}
blocks={blocks.filter((block) => block.products.length > 0)}
region={region}
/>
</>
)
}
