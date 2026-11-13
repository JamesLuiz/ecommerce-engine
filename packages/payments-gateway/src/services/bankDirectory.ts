import { redis } from "../redis.js"
import { createPaystackClient } from "./paystack.js"
import { countryForCurrency, isPaystackTestKey } from "./banks.js"
import type { Bank, Vendor } from "../types.js"

const CACHE_TTL_MS = 24 * 60 * 60 * 1000
const CACHE_TTL_SECONDS = 24 * 60 * 60
const REDIS_TIMEOUT_MS = 750

type CacheEntry = {
  value: Bank[]
  expiresAt: number
}

const memoryCache = new Map<string, CacheEntry>()

const redisGet = async (key: string): Promise<string | null> => {
  if (redis.status !== "ready") {
    return null
  }

  try {
    return await Promise.race([
      redis.get(key),
      new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), REDIS_TIMEOUT_MS)
      }),
    ])
  } catch {
    return null
  }
}

const redisSet = async (key: string, value: string): Promise<void> => {
  if (redis.status !== "ready") {
    return
  }

  try {
    await Promise.race([
      redis.set(key, value, "EX", CACHE_TTL_SECONDS),
      new Promise<void>((resolve) => {
        setTimeout(resolve, REDIS_TIMEOUT_MS)
      }),
    ])
  } catch {
    // The cache is an optimisation; a Redis outage must not break the bank list.
  }
}

export const listBanksForVendor = async (vendor: Vendor): Promise<Bank[]> => {
  const currency = (vendor.currency || "NGN").trim().toUpperCase()
  const country = countryForCurrency(currency)
  const secretKey = process.env.PAYSTACK_SECRET_KEY ?? ""
  const mode = isPaystackTestKey(secretKey) ? "test" : "live"
  const cacheKey = `banks:${country}:${currency}:${mode}`
  const now = Date.now()

  const cachedInMemory = memoryCache.get(cacheKey)

  if (cachedInMemory && cachedInMemory.expiresAt > now) {
    return cachedInMemory.value
  }

  const cachedInRedis = await redisGet(cacheKey)

  if (cachedInRedis) {
    try {
      const parsed = JSON.parse(cachedInRedis) as Bank[]

      if (Array.isArray(parsed) && parsed.length > 0) {
        memoryCache.set(cacheKey, { value: parsed, expiresAt: now + CACHE_TTL_MS })
        return parsed
      }
    } catch {
      // Ignore a malformed cache entry and refresh from Paystack.
    }
  }

  const banks = await createPaystackClient().listBanks(country, currency)

  memoryCache.set(cacheKey, { value: banks, expiresAt: now + CACHE_TTL_MS })
  await redisSet(cacheKey, JSON.stringify(banks))

  return banks
}
