"use client"

import { useStoreConfig } from "@lib/config-provider"

import { resolveHomeContent } from "./content"
import { resolveLayoutId, type HomeData, type LayoutId } from "./registry"
import AuroraLayout from "./layouts/aurora"
import AirLayout from "./layouts/air"
import BreezeLayout from "./layouts/breeze"
import BrutalLayout from "./layouts/brutal"
import ChromeLayout from "./layouts/chrome"
import EmberLayout from "./layouts/ember"
import LiquidLayout from "./layouts/liquid"
import LuxeLayout from "./layouts/luxe"
import MinimalLayout from "./layouts/minimal"
import PopLayout from "./layouts/pop"
import StreetLayout from "./layouts/street"
import TerraLayout from "./layouts/terra"
import TitaniumLayout from "./layouts/titanium"

/**
 * Switchable storefront homepage.
 *
 * Reads `settings.theme.preset` from the live runtime config (updated over
 * SSE whenever staff save Settings → Storefront) and renders the matching
 * layout with the same products and merchant content. Wraps everything in a
 * `data-layout` scope so the per-layout palettes in `globals.css` apply, and
 * keys the layout root by id so switching designs replays entrance
 * animations.
 */
export default function ThemedHome(data: HomeData) {
  const config = useStoreConfig()
  const layoutId: LayoutId = resolveLayoutId(config.settings?.theme?.preset)
  const content = resolveHomeContent(config)

  const layoutProps = {
    content,
    featured: data.featured,
    arrivals: data.arrivals,
    blocks: data.blocks,
  }

  return (
    <div data-layout={layoutId} key={layoutId}>
      {layoutId === "aurora" && <AuroraLayout {...layoutProps} />}
      {layoutId === "luxe" && <LuxeLayout {...layoutProps} />}
      {layoutId === "street" && <StreetLayout {...layoutProps} />}
      {layoutId === "brutal" && <BrutalLayout {...layoutProps} />}
      {layoutId === "breeze" && <BreezeLayout {...layoutProps} />}
      {layoutId === "ember" && <EmberLayout {...layoutProps} />}
      {layoutId === "terra" && <TerraLayout {...layoutProps} />}
      {layoutId === "chrome" && <ChromeLayout {...layoutProps} />}
      {layoutId === "pop" && <PopLayout {...layoutProps} />}
      {layoutId === "air" && <AirLayout {...layoutProps} />}
      {layoutId === "titanium" && <TitaniumLayout {...layoutProps} />}
      {layoutId === "liquid" && <LiquidLayout {...layoutProps} />}
      {layoutId === "minimal" && <MinimalLayout {...layoutProps} />}
    </div>
  )
}
