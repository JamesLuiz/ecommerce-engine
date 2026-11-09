export type StoreBrandSettings = {
  name: string
  handle: string
  description: string
  vendorName: string
  logoUrl: string
  primaryColor: string
}

const readString = (value: unknown, fallback = "") => {
  return typeof value === "string" ? value : fallback
}

export const getStoreBrandSettings = (store?: {
  name?: string | null
  metadata?: Record<string, unknown> | null
} | null): StoreBrandSettings => {
  const metadata = (store?.metadata ?? {}) as Record<string, unknown>
  const fallbackName = store?.name || "Flowcheq"

  return {
    name: readString(
      metadata.store_name ?? metadata.brand_name ?? fallbackName,
      fallbackName
    ),
    handle: readString(
      metadata.store_handle ?? metadata.brand_handle ?? "",
      ""
    ),
    description: readString(
      metadata.store_description ?? metadata.brand_description ?? "",
      ""
    ),
    vendorName: readString(
      metadata.vendor_name ?? metadata.full_name_of_vendor ?? "",
      ""
    ),
    logoUrl: readString(
      metadata.brand_logo_url ?? metadata.store_logo_url ?? "",
      ""
    ),
    primaryColor: readString(
      metadata.brand_primary_color ?? metadata.store_primary_color ?? "#5B4FF9",
      "#5B4FF9"
    ),
  }
}
