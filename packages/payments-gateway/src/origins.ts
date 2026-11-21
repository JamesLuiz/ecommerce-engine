/**
 * Origin helpers shared by vendor registration and callback validation.
 *
 * Vendor records keep origins as exact origins (`https://shop.example.com`) or
 * wildcard subdomain patterns (`https://*.example.com`). Wildcards let one
 * tenant cover its generated store/admin domains without hardcoding every
 * Coolify hostname.
 */
export function normalizeOrigin(value?: string | null): string | null {
  const candidate = value?.trim()

  if (!candidate) {
    return null
  }

  for (const url of [candidate, `https://${candidate}`]) {
    try {
      return new URL(url).origin
    } catch {
      // Try the next form.
    }
  }

  return null
}

export function originMatches(origin: string, allowed: string): boolean {
  const pattern = allowed.trim()
  const wildcard = /^(https?):\/\/\*\.([^/]+)$/i.exec(pattern)

  if (wildcard) {
    const scheme = wildcard[1].toLowerCase()
    const suffix = wildcard[2].toLowerCase()
    const candidate = origin.toLowerCase()

    return (
      candidate.startsWith(`${scheme}://`) && candidate.endsWith(`.${suffix}`)
    )
  }

  return normalizeOrigin(pattern) === origin
}

export function mergeOrigins(
  current: string[] | null | undefined,
  incoming: string[] | null | undefined,
): string[] {
  const merged: string[] = []

  const add = (value: string) => {
    const normalized = normalizeOrigin(value) ?? value.trim()

    if (normalized && !merged.includes(normalized)) {
      merged.push(normalized)
    }
  }

  for (const origin of current ?? []) {
    add(origin)
  }

  for (const origin of incoming ?? []) {
    add(origin)
  }

  return merged
}
