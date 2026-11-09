import type { StorefrontSettings } from "@flowcheq/storefront-config"

export type StoreSettingsEvent = {
  type: "storefront.settings.updated"
  storeId: string
  settings: StorefrontSettings
  updatedAt: string
}

type Listener = (event: StoreSettingsEvent) => void

const listenersByStore = new Map<string, Set<Listener>>()

/**
 * In-memory publish/subscribe hub for storefront settings changes.
 *
 * One Medusa backend process serves many tenants; each tenant is identified
 * by its store id. When a staff member saves storefront settings from the
 * admin, the backend publishes an event here and every storefront connected
 * to that store receives it over SSE and re-hydrates its UI live.
 *
 * Note: this is process-local. A multi-container deployment should swap this
 * for a Redis-backed pub/sub layer with the same subscribe/publish shape.
 */
export const storeSettingsHub = {
  subscribe(storeId: string, listener: Listener) {
    let set = listenersByStore.get(storeId)
    if (!set) {
      set = new Set()
      listenersByStore.set(storeId, set)
    }

    set.add(listener)

    return () => {
      set.delete(listener)
      if (set.size === 0) {
        listenersByStore.delete(storeId)
      }
    }
  },

  publish(storeId: string, settings: StorefrontSettings) {
    const event: StoreSettingsEvent = {
      type: "storefront.settings.updated",
      storeId,
      settings,
      updatedAt: new Date().toISOString(),
    }

    const set = listenersByStore.get(storeId)
    if (!set) {
      return
    }

    for (const listener of set) {
      try {
        listener(event)
      } catch {
        // A listener must never break the broadcast of other listeners.
      }
    }
  },

  listenerCount(storeId: string) {
    return listenersByStore.get(storeId)?.size ?? 0
  },
}
