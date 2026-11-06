"use client"

import type { MedusaSdkLike } from "@medusajs/instantsearch-adapter"
import Medusa from "@medusajs/js-sdk"
import { useMemo } from "react"

import { useStoreConfig } from "./config-provider"
import { createSearchClient } from "./search-client"

/**
 * Client-side Medusa SDK built from the runtime config handed down by the
 * server layout. Used by interactive components that need to call the store
 * API directly (product options, search).
 */
export function useStoreSdk() {
  const { backendUrl, publishableKey } = useStoreConfig()

  return useMemo(
    () =>
      new Medusa({
        baseUrl: backendUrl,
        publishableKey,
      }),
    [backendUrl, publishableKey]
  )
}

export function useSearchClient() {
  const sdk = useStoreSdk()

  return useMemo(
    () => createSearchClient(sdk as unknown as MedusaSdkLike),
    [sdk]
  )
}
