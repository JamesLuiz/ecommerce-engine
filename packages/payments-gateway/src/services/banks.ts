const COUNTRY_BY_CURRENCY: Record<string, string> = {
  NGN: "nigeria",
  GHS: "ghana",
  KES: "kenya",
  ZAR: "south africa",
}

export const countryForCurrency = (currency: string): string =>
  COUNTRY_BY_CURRENCY[currency.trim().toUpperCase()] ?? "nigeria"

export const isPaystackTestKey = (secretKey: string): boolean =>
  secretKey.trim().startsWith("sk_test_")
