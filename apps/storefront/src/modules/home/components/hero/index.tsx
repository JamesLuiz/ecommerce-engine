"use client"

import { Heading } from "@modules/common/components/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useStoreConfig } from "@lib/config-provider"

const emptyHero = {
  enabled: true,
  eyebrow: "",
  title: "Modern essentials",
  heading: "Designed to feel as good as it looks.",
  description:
    "Discover elevated products for everyday rituals, curated with premium quality, practical design, and next-level comfort.",
  primaryCta: "Shop now",
  secondaryCta: "Learn more",
  imageUrl: "",
}

/**
 * The homepage hero. Brand colours and content come from the live runtime
 * config context, so staff can change them in the Medusa admin and the
 * storefront re-renders immediately via SSE — no reload required.
 */
export default function Hero() {
  const { storeName, logoUrl, primaryColor, settings } = useStoreConfig()

  const hero = settings?.homepage?.hero ?? emptyHero
  const stats = settings?.homepage?.stats ?? []

  if (!hero.enabled) {
    return null
  }

  return (
    <section className="relative overflow-hidden border-b border-black/5 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.9),_rgba(245,243,239,0.96)_26%,_rgba(236,231,225,1)_100%)]">
      <div className="content-container grid items-center gap-10 py-14 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
        <div className="relative z-10 max-w-xl">
          <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-black/5 bg-white/75 px-4 py-2 shadow-sm backdrop-blur-sm">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={`${storeName} logo`}
                className="h-8 w-8 rounded-lg object-cover"
              />
            ) : (
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[10px] font-semibold text-white"
                style={{ backgroundColor: primaryColor }}
              >
                {storeName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <span className="text-[11px] font-medium uppercase tracking-[0.22em] text-neutral-600">
              {hero.eyebrow}
            </span>
          </div>

          <Heading
            level="h1"
            className="max-w-lg text-5xl font-semibold leading-[0.95] tracking-[-0.06em] text-neutral-900 md:text-6xl"
          >
            {hero.title}
          </Heading>

          <Heading
            level="h2"
            className="mt-4 max-w-lg text-3xl font-medium leading-tight tracking-[-0.05em] text-neutral-700 md:text-4xl"
          >
            {hero.heading}
          </Heading>

          <p className="mt-6 max-w-lg text-lg leading-8 text-neutral-600">
            {hero.description}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <LocalizedClientLink
              href="/store"
              className="inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-medium text-white shadow-lg shadow-black/10 transition-transform duration-200 hover:-translate-y-0.5"
              style={{ backgroundColor: primaryColor }}
            >
              {hero.primaryCta}
            </LocalizedClientLink>
            <LocalizedClientLink
              href="/store"
              className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white/70 px-6 py-3 text-sm font-medium text-neutral-900 transition-colors duration-200 hover:bg-white"
            >
              {hero.secondaryCta}
            </LocalizedClientLink>
          </div>

          {stats.length > 0 && (
            <div className="mt-10 grid max-w-md grid-cols-3 gap-4">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-black/5 bg-white/60 px-3 py-4 backdrop-blur-sm"
                >
                  <div className="text-xl font-semibold tracking-[-0.04em] text-neutral-900">
                    {stat.value}
                  </div>
                  <div className="mt-1 text-[11px] uppercase tracking-[0.12em] text-neutral-500">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="relative flex justify-center lg:justify-end">
          <div className="relative w-full max-w-[520px]">
            <div
              className="absolute -left-5 top-10 h-48 w-48 rounded-full blur-3xl"
              style={{ backgroundColor: `${primaryColor}22` }}
            />
            <div className="absolute -right-6 bottom-8 h-52 w-52 rounded-full bg-neutral-200/80 blur-3xl" />

            <div className="glass-panel relative overflow-hidden rounded-[32px] p-4">
              <div className="rounded-[28px] bg-neutral-100 p-4">
                <div className="rounded-[24px] bg-gradient-to-br from-neutral-200 via-white to-neutral-100 p-3">
                  <div className="flex items-center justify-between pb-3 text-[10px] uppercase tracking-[0.2em] text-neutral-500">
                    <span>Featured</span>
                    <span>New drop</span>
                  </div>

                  <div className="relative h-[440px] overflow-hidden rounded-[22px] bg-gradient-to-br from-white to-stone-200">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(0,0,0,0.08),_transparent_45%)]" />
                    <div
                      className="absolute left-8 top-8 h-28 w-28 rounded-[32px] shadow-[0_30px_60px_rgba(17,17,17,0.1)]"
                      style={{ backgroundColor: primaryColor }}
                    />
                    <div className="absolute bottom-7 left-7 right-7 rounded-[28px] border border-black/5 bg-white/85 p-5 shadow-[0_30px_80px_rgba(17,17,17,0.10)] backdrop-blur-md">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">
                            Signature edition
                          </div>
                          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.06em] text-neutral-900">
                            Everyday carry
                          </h2>
                        </div>
                        <div className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-sm font-medium text-neutral-900">
                          $129
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
