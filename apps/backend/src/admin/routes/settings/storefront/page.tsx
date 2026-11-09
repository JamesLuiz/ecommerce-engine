import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  Button,
  Checkbox,
  Container,
  Heading,
  Input,
  Label,
  Select,
  Switch,
  Tabs,
  Text,
  Textarea,
  toast,
} from "@medusajs/ui"
import type { StorefrontSettings } from "@flowcheq/storefront-config"
import { useEffect, useState } from "react"

type ThemeMode = "light" | "dark" | "system"
type ThemePreset = "minimal" | "editorial" | "bold" | "classic"
type HeaderStyle = "centered" | "split" | "minimal"
type FooterStyle = "compact" | "extended"
type FontFamily = "sans" | "serif" | "mono"
type CornerRadius = "none" | "sm" | "md" | "lg"

type NavLinkDraft = { label: string; href: string }

type SocialDraft = { platform: string; url: string }

type LegalDraft = { label: string; href: string }

const emptySettings = (): StorefrontSettings => ({
  version: 1,
  brand: {
    name: "Flowcheq Commerce",
    tagline: "",
    description: "",
    vendorName: "",
    logoUrl: "",
    faviconUrl: "",
    primaryColor: "#5B4FF9",
    accentColor: "#111111",
    fontFamily: "sans",
    cornerRadius: "md",
  },
  theme: { mode: "light", preset: "minimal" },
  layout: {
    headerStyle: "centered",
    footerStyle: "compact",
    homepageHeroEnabled: true,
    homepageFeaturedEnabled: true,
  },
  homepage: {
    hero: {
      enabled: true,
      eyebrow: "",
      title: "",
      heading: "",
      description: "",
      primaryCta: "Shop now",
      secondaryCta: "Learn more",
      imageUrl: "",
    },
    featuredEnabled: true,
    stats: [],
  },
  navigation: { links: [] },
  features: {
    announcementBarEnabled: true,
    announcementBarText: "",
    announcementBarCtaLabel: "",
    announcementBarCtaHref: "/",
    showSearch: true,
    showAccount: true,
    showLocaleSelector: true,
    showCountrySelector: true,
    whatsappEnabled: false,
    whatsappNumber: "",
    newsletterEnabled: false,
  },
  footer: {
    contact: { email: "", phone: "", address: "", hours: "" },
    socials: [],
    legal: [],
    copyright: "",
    poweredBy: true,
  },
  seo: {
    defaultTitle: "",
    titleTemplate: "%s | {store}",
    description: "",
    keywords: [],
    ogImageUrl: "",
  },
})

const BrandingSection = ({
  settings,
  updateBrand,
}: {
  settings: StorefrontSettings
  updateBrand: (patch: Partial<StorefrontSettings["brand"]>) => void
}) => {
  const brand = settings.brand

  const handleLogoUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    const formData = new FormData()
    formData.append("files", new File([file], file.name, { type: file.type }))
    const response = await fetch("/admin/storefront-assets", {
      method: "POST",
      body: formData,
      credentials: "same-origin",
    })
    const payload = (await response.json().catch(() => null)) as {
      files?: Array<{ url?: string; key?: string }>
    } | null

    const logoUrl = payload?.files?.[0]?.url ?? payload?.files?.[0]?.key

    if (logoUrl) {
      updateBrand({ logoUrl: String(logoUrl) })
      toast.success("Logo uploaded")
    }
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gap: 8 }}>
        <Label htmlFor="storefront-brand-name">Store name</Label>
        <Input
          id="storefront-brand-name"
          value={brand.name}
          onChange={(event) =>
            updateBrand({ name: event.target.value })
          }
        />
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        <Label htmlFor="storefront-brand-tagline">Tagline</Label>
        <Input
          id="storefront-brand-tagline"
          value={brand.tagline}
          onChange={(event) => updateBrand({ tagline: event.target.value })}
        />
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        <Label htmlFor="storefront-brand-description">Store description</Label>
        <Textarea
          id="storefront-brand-description"
          value={brand.description}
          onChange={(event) => updateBrand({ description: event.target.value })}
        />
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        <Label htmlFor="storefront-brand-vendor">Vendor full name</Label>
        <Input
          id="storefront-brand-vendor"
          value={brand.vendorName}
          onChange={(event) => updateBrand({ vendorName: event.target.value })}
        />
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        <Label htmlFor="storefront-brand-logo-url">Logo URL</Label>
        <Input
          id="storefront-brand-logo-url"
          value={brand.logoUrl}
          onChange={(event) => updateBrand({ logoUrl: event.target.value })}
        />
        <div>
          <Label htmlFor="storefront-brand-logo-file">Upload logo</Label>
          <Input
            id="storefront-brand-logo-file"
            type="file"
            accept="image/*"
            onChange={(event) => void handleLogoUpload(event)}
          />
        </div>
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        <Label htmlFor="storefront-brand-primary">Brand primary color</Label>
        <Input
          id="storefront-brand-primary"
          type="color"
          value={brand.primaryColor}
          onChange={(event) => updateBrand({ primaryColor: event.target.value })}
          style={{ height: 40, padding: 0 }}
        />
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        <Label htmlFor="storefront-brand-accent">Brand accent color</Label>
        <Input
          id="storefront-brand-accent"
          type="color"
          value={brand.accentColor}
          onChange={(event) => updateBrand({ accentColor: event.target.value })}
          style={{ height: 40, padding: 0 }}
        />
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        <Label htmlFor="storefront-brand-font">Brand font</Label>
        <Select
          value={brand.fontFamily}
          onValueChange={(value) => updateBrand({ fontFamily: value as FontFamily })}
        >
          <Select.Trigger>
            <Select.Value placeholder="Font" />
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="sans">Sans</Select.Item>
            <Select.Item value="serif">Serif</Select.Item>
            <Select.Item value="mono">Mono</Select.Item>
          </Select.Content>
        </Select>
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        <Label htmlFor="storefront-brand-radius">Corner radius</Label>
        <Select
          value={brand.cornerRadius}
          onValueChange={(value) => updateBrand({ cornerRadius: value as CornerRadius })}
        >
          <Select.Trigger>
            <Select.Value placeholder="Radius" />
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="none">None</Select.Item>
            <Select.Item value="sm">Small</Select.Item>
            <Select.Item value="md">Medium</Select.Item>
            <Select.Item value="lg">Large</Select.Item>
          </Select.Content>
        </Select>
      </div>
    </div>
  )
}

const ThemeLayoutSection = ({
  settings,
  updateTheme,
  updateLayout,
}: {
  settings: StorefrontSettings
  updateTheme: (patch: Partial<StorefrontSettings["theme"]>) => void
  updateLayout: (patch: Partial<StorefrontSettings["layout"]>) => void
}) => (
  <div style={{ display: "grid", gap: 16 }}>
    <div style={{ display: "grid", gap: 8 }}>
      <Label htmlFor="storefront-theme-mode">Theme mode</Label>
      <Select
        value={settings.theme.mode}
        onValueChange={(value) => updateTheme({ mode: value as ThemeMode })}
      >
        <Select.Trigger>
          <Select.Value placeholder="Theme mode" />
        </Select.Trigger>
        <Select.Content>
          <Select.Item value="light">Light</Select.Item>
          <Select.Item value="dark">Dark</Select.Item>
          <Select.Item value="system">System</Select.Item>
        </Select.Content>
      </Select>
    </div>

    <div style={{ display: "grid", gap: 8 }}>
      <Label htmlFor="storefront-theme-preset">Theme preset</Label>
      <Select
        value={settings.theme.preset}
        onValueChange={(value) => updateTheme({ preset: value as ThemePreset })}
      >
        <Select.Trigger>
          <Select.Value placeholder="Theme preset" />
        </Select.Trigger>
        <Select.Content>
          <Select.Item value="minimal">Minimal</Select.Item>
          <Select.Item value="editorial">Editorial</Select.Item>
          <Select.Item value="bold">Bold</Select.Item>
          <Select.Item value="classic">Classic</Select.Item>
        </Select.Content>
      </Select>
    </div>

    <div style={{ display: "grid", gap: 8 }}>
      <Label htmlFor="storefront-layout-header">Header style</Label>
      <Select
        value={settings.layout.headerStyle}
        onValueChange={(value) => updateLayout({ headerStyle: value as HeaderStyle })}
      >
        <Select.Trigger>
          <Select.Value placeholder="Header style" />
        </Select.Trigger>
        <Select.Content>
          <Select.Item value="centered">Centered</Select.Item>
          <Select.Item value="split">Split</Select.Item>
          <Select.Item value="minimal">Minimal</Select.Item>
        </Select.Content>
      </Select>
    </div>

    <div style={{ display: "grid", gap: 8 }}>
      <Label htmlFor="storefront-layout-footer">Footer style</Label>
      <Select
        value={settings.layout.footerStyle}
        onValueChange={(value) => updateLayout({ footerStyle: value as FooterStyle })}
      >
        <Select.Trigger>
          <Select.Value placeholder="Footer style" />
        </Select.Trigger>
        <Select.Content>
          <Select.Item value="compact">Compact</Select.Item>
          <Select.Item value="extended">Extended</Select.Item>
        </Select.Content>
      </Select>
    </div>

    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
      <Switch
        checked={settings.layout.homepageHeroEnabled}
        onCheckedChange={(checked) =>
          updateLayout({ homepageHeroEnabled: Boolean(checked) })
        }
      />
      <Text size="small">Show homepage hero</Text>
    </div>

    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
      <Switch
        checked={settings.layout.homepageFeaturedEnabled}
        onCheckedChange={(checked) =>
          updateLayout({ homepageFeaturedEnabled: Boolean(checked) })
        }
      />
      <Text size="small">Show featured products on homepage</Text>
    </div>
  </div>
)

const HomeSection = ({
  settings,
  updateHomepage,
}: {
  settings: StorefrontSettings
  updateHomepage: (patch: Partial<StorefrontSettings["homepage"]>) => void
}) => {
  const hero = settings.homepage.hero

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <Switch
          checked={hero.enabled}
          onCheckedChange={(checked) =>
            updateHomepage({ hero: { ...hero, enabled: Boolean(checked) } })
          }
        />
        <Text size="small">Enable homepage hero</Text>
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        <Label htmlFor="storefront-hero-eyebrow">Hero eyebrow</Label>
        <Input
          id="storefront-hero-eyebrow"
          value={hero.eyebrow}
          onChange={(event) => updateHomepage({ hero: { ...hero, eyebrow: event.target.value } })}
        />
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        <Label htmlFor="storefront-hero-title">Hero title</Label>
        <Input
          id="storefront-hero-title"
          value={hero.title}
          onChange={(event) => updateHomepage({ hero: { ...hero, title: event.target.value } })}
        />
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        <Label htmlFor="storefront-hero-heading">Hero heading</Label>
        <Input
          id="storefront-hero-heading"
          value={hero.heading}
          onChange={(event) => updateHomepage({ hero: { ...hero, heading: event.target.value } })}
        />
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        <Label htmlFor="storefront-hero-description">Hero description</Label>
        <Textarea
          id="storefront-hero-description"
          value={hero.description}
          onChange={(event) => updateHomepage({ hero: { ...hero, description: event.target.value } })}
        />
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        <Label htmlFor="storefront-hero-primary-cta">Primary CTA</Label>
        <Input
          id="storefront-hero-primary-cta"
          value={hero.primaryCta}
          onChange={(event) => updateHomepage({ hero: { ...hero, primaryCta: event.target.value } })}
        />
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        <Label htmlFor="storefront-hero-secondary-cta">Secondary CTA</Label>
        <Input
          id="storefront-hero-secondary-cta"
          value={hero.secondaryCta}
          onChange={(event) => updateHomepage({ hero: { ...hero, secondaryCta: event.target.value } })}
        />
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        <Label htmlFor="storefront-hero-image-url">Hero image URL</Label>
        <Input
          id="storefront-hero-image-url"
          value={hero.imageUrl}
          onChange={(event) => updateHomepage({ hero: { ...hero, imageUrl: event.target.value } })}
        />
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <Switch
          checked={settings.homepage.featuredEnabled}
          onCheckedChange={(checked) =>
            updateHomepage({ featuredEnabled: Boolean(checked) })
          }
        />
        <Text size="small">Show featured products</Text>
      </div>
    </div>
  )
}

const NavigationFeaturesSection = ({
  settings,
  updateNavigation,
  updateFeatures,
}: {
  settings: StorefrontSettings
  updateNavigation: (patch: Partial<StorefrontSettings["navigation"]>) => void
  updateFeatures: (patch: Partial<StorefrontSettings["features"]>) => void
}) => {
  const links = settings.navigation.links

  const updateLink = (index: number, patch: Partial<NavLinkDraft>) => {
    const next = links.map((link, currentIndex) =>
      currentIndex === index ? { ...link, ...patch } : link,
    )
    updateNavigation({ links: next })
  }

  const removeLink = (index: number) => {
    updateNavigation({ links: links.filter((_, currentIndex) => currentIndex !== index) })
  }

  const addLink = () => {
    updateNavigation({ links: [...links, { label: "Link", href: "/" }] })
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gap: 8 }}>
        <Text size="small">Navigation links</Text>
        {links.map((link, index) => (
          <div key={`${link.label}-${link.href}-${index}`} style={{ display: "grid", gap: 8 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <Input
                value={link.label}
                onChange={(event) => updateLink(index, { label: event.target.value })}
              />
              <Input
                value={link.href}
                onChange={(event) => updateLink(index, { href: event.target.value })}
              />
            </div>
            <Button type="button" variant="danger" onClick={() => removeLink(index)}>
              Remove
            </Button>
          </div>
        ))}
        <Button type="button" variant="secondary" onClick={() => addLink()}>
          Add navigation link
        </Button>
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        <Text size="small">Announcement bar</Text>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Switch
            checked={settings.features.announcementBarEnabled}
            onCheckedChange={(checked) =>
              updateFeatures({ announcementBarEnabled: Boolean(checked) })
            }
          />
          <Text size="small">Show announcement bar</Text>
        </div>
        <Input
          value={settings.features.announcementBarText}
          onChange={(event) =>
            updateFeatures({ announcementBarText: event.target.value })
          }
        />
        <Input
          value={settings.features.announcementBarCtaLabel}
          onChange={(event) =>
            updateFeatures({ announcementBarCtaLabel: event.target.value })
          }
        />
        <Input
          value={settings.features.announcementBarCtaHref}
          onChange={(event) =>
            updateFeatures({ announcementBarCtaHref: event.target.value })
          }
        />
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        <Text size="small">Storefront features</Text>
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <Switch
              checked={settings.features.showSearch}
              onCheckedChange={(checked) => updateFeatures({ showSearch: Boolean(checked) })}
            />
            <Text size="small">Show search</Text>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <Switch
              checked={settings.features.showAccount}
              onCheckedChange={(checked) => updateFeatures({ showAccount: Boolean(checked) })}
            />
            <Text size="small">Show account</Text>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <Switch
              checked={settings.features.showLocaleSelector}
              onCheckedChange={(checked) =>
                updateFeatures({ showLocaleSelector: Boolean(checked) })
              }
            />
            <Text size="small">Show locale selector</Text>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <Switch
              checked={settings.features.showCountrySelector}
              onCheckedChange={(checked) =>
                updateFeatures({ showCountrySelector: Boolean(checked) })
              }
            />
            <Text size="small">Show country selector</Text>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <Switch
              checked={settings.features.whatsappEnabled}
              onCheckedChange={(checked) => updateFeatures({ whatsappEnabled: Boolean(checked) })}
            />
            <Text size="small">Show WhatsApp contact button</Text>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <Switch
              checked={settings.features.newsletterEnabled}
              onCheckedChange={(checked) => updateFeatures({ newsletterEnabled: Boolean(checked) })}
            />
            <Text size="small">Show newsletter signup</Text>
          </div>
        </div>
        <Input
          value={settings.features.whatsappNumber}
          onChange={(event) => updateFeatures({ whatsappNumber: event.target.value })}
        />
      </div>
    </div>
  )
}

const FooterContactSection = ({
  settings,
  updateFooter,
}: {
  settings: StorefrontSettings
  updateFooter: (patch: Partial<StorefrontSettings["footer"]>) => void
}) => {
  const footer = settings.footer
  const contact = footer.contact

  const updateContact = (patch: Partial<StorefrontSettings["footer"]["contact"]>) =>
    updateFooter({ contact: { ...contact, ...patch } })

  const updateSocial = (index: number, patch: Partial<SocialDraft>) => {
    const socials = footer.socials.map((social, currentIndex) =>
      currentIndex === index ? { ...social, ...patch } : social,
    )
    updateFooter({ socials })
  }

  const removeSocial = (index: number) => {
    updateFooter({ socials: footer.socials.filter((_, currentIndex) => currentIndex !== index) })
  }

  const addSocial = () => {
    updateFooter({ socials: [...footer.socials, { platform: "instagram", url: "" }] })
  }

  const updateLegal = (index: number, patch: Partial<LegalDraft>) => {
    const legal = footer.legal.map((item, currentIndex) =>
      currentIndex === index ? { ...item, ...patch } : item,
    )
    updateFooter({ legal })
  }

  const removeLegal = (index: number) => {
    updateFooter({ legal: footer.legal.filter((_, currentIndex) => currentIndex !== index) })
  }

  const addLegal = () => {
    updateFooter({ legal: [...footer.legal, { label: "Link", href: "/" }] })
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gap: 8 }}>
        <Text size="small">Contact details</Text>
        <Input
          value={contact.email}
          onChange={(event) => updateContact({ email: event.target.value })}
        />
        <Input
          value={contact.phone}
          onChange={(event) => updateContact({ phone: event.target.value })}
        />
        <Input
          value={contact.address}
          onChange={(event) => updateContact({ address: event.target.value })}
        />
        <Input
          value={contact.hours}
          onChange={(event) => updateContact({ hours: event.target.value })}
        />
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        <Text size="small">Socials</Text>
        {footer.socials.map((social, index) => (
          <div key={`${social.platform}-${social.url}-${index}`} style={{ display: "grid", gap: 8 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 8 }}>
              <Input
                value={social.platform}
                onChange={(event) => updateSocial(index, { platform: event.target.value })}
              />
              <Input
                value={social.url}
                onChange={(event) => updateSocial(index, { url: event.target.value })}
              />
            </div>
            <Button type="button" variant="danger" onClick={() => removeSocial(index)}>
              Remove
            </Button>
          </div>
        ))}
        <Button type="button" variant="secondary" onClick={() => addSocial()}>
          Add social
        </Button>
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        <Text size="small">Legal links</Text>
        {footer.legal.map((item, index) => (
          <div key={`${item.label}-${item.href}-${index}`} style={{ display: "grid", gap: 8 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 8 }}>
              <Input
                value={item.label}
                onChange={(event) => updateLegal(index, { label: event.target.value })}
              />
              <Input
                value={item.href}
                onChange={(event) => updateLegal(index, { href: event.target.value })}
              />
            </div>
            <Button type="button" variant="danger" onClick={() => removeLegal(index)}>
              Remove
            </Button>
          </div>
        ))}
        <Button type="button" variant="secondary" onClick={() => addLegal()}>
          Add legal link
        </Button>
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        <Input
          value={footer.copyright}
          onChange={(event) => updateFooter({ copyright: event.target.value })}
        />
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Switch
            checked={footer.poweredBy}
            onCheckedChange={(checked) => updateFooter({ poweredBy: Boolean(checked) })}
          />
          <Text size="small">Show powered by</Text>
        </div>
      </div>
    </div>
  )
}

const SeoSection = ({
  settings,
  updateSeo,
}: {
  settings: StorefrontSettings
  updateSeo: (patch: Partial<StorefrontSettings["seo"]>) => void
}) => {
  const seo = settings.seo

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gap: 8 }}>
        <Label htmlFor="storefront-seo-default-title">Default title</Label>
        <Input
          id="storefront-seo-default-title"
          value={seo.defaultTitle}
          onChange={(event) => updateSeo({ defaultTitle: event.target.value })}
        />
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        <Label htmlFor="storefront-seo-title-template">Title template</Label>
        <Input
          id="storefront-seo-title-template"
          value={seo.titleTemplate}
          onChange={(event) => updateSeo({ titleTemplate: event.target.value })}
        />
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        <Label htmlFor="storefront-seo-description">Default description</Label>
        <Textarea
          id="storefront-seo-description"
          value={seo.description}
          onChange={(event) => updateSeo({ description: event.target.value })}
        />
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        <Label htmlFor="storefront-seo-keywords">Keywords</Label>
        <Textarea
          id="storefront-seo-keywords"
          value={seo.keywords.join(", ")}
          onChange={(event) =>
            updateSeo({ keywords: event.target.value.split(",").map((keyword) => keyword.trim()).filter(Boolean) })
          }
        />
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        <Label htmlFor="storefront-seo-og-image">Social image URL</Label>
        <Input
          id="storefront-seo-og-image"
          value={seo.ogImageUrl}
          onChange={(event) => updateSeo({ ogImageUrl: event.target.value })}
        />
      </div>
    </div>
  )
}

const Branding = ({
  settings,
  updateBrand,
}: {
  settings: StorefrontSettings
  updateBrand: (patch: Partial<StorefrontSettings["brand"]>) => void
}) => <BrandingSection settings={settings} updateBrand={updateBrand} />

const StorefrontSettingsPage = () => {
  const [settings, setSettings] = useState<StorefrontSettings>(emptySettings)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [feedback, setFeedback] = useState("")

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch("/admin/storefront-settings", {
          credentials: "same-origin",
        })

        if (!response.ok) {
          throw new Error("Unable to load storefront settings")
        }

        const payload = (await response.json()) as StorefrontSettings
        setSettings({ ...emptySettings(), ...payload })
      } catch {
        setFeedback("Unable to load the current storefront settings.")
      } finally {
        setIsLoading(false)
      }
    }

    void loadSettings()
  }, [])

  const update = (patch: Partial<StorefrontSettings>) => {
    setSettings((current) => ({ ...current, ...patch }))
  }

  const updateBrand = (patch: Partial<StorefrontSettings["brand"]>) => {
    setSettings((current) => ({ ...current, brand: { ...current.brand, ...patch } }))
  }

  const updateTheme = (patch: Partial<StorefrontSettings["theme"]>) => {
    setSettings((current) => ({ ...current, theme: { ...current.theme, ...patch } }))
  }

  const updateLayout = (patch: Partial<StorefrontSettings["layout"]>) => {
    setSettings((current) => ({ ...current, layout: { ...current.layout, ...patch } }))
  }

  const updateHomepage = (patch: Partial<StorefrontSettings["homepage"]>) => {
    setSettings((current) => ({ ...current, homepage: { ...current.homepage, ...patch } }))
  }

  const updateNavigation = (patch: Partial<StorefrontSettings["navigation"]>) => {
    setSettings((current) => ({ ...current, navigation: { ...current.navigation, ...patch } }))
  }

  const updateFeatures = (patch: Partial<StorefrontSettings["features"]>) => {
    setSettings((current) => ({ ...current, features: { ...current.features, ...patch } }))
  }

  const updateFooter = (patch: Partial<StorefrontSettings["footer"]>) => {
    setSettings((current) => ({ ...current, footer: { ...current.footer, ...patch } }))
  }

  const updateSeo = (patch: Partial<StorefrontSettings["seo"]>) => {
    setSettings((current) => ({ ...current, seo: { ...current.seo, ...patch } }))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSaving(true)
    setFeedback("")

    const payload = {
      version: settings.version,
      brand: {
        ...settings.brand,
        primaryColor: settings.brand.primaryColor || "#111111",
        accentColor: settings.brand.accentColor || "#111111",
      },
      theme: settings.theme,
      layout: settings.layout,
      homepage: settings.homepage,
      navigation: settings.navigation,
      features: settings.features,
      footer: settings.footer,
      seo: settings.seo,
    }

    try {
      const response = await fetch("/admin/storefront-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error("Unable to save storefront settings")
      }

      setFeedback("Storefront settings saved successfully.")
      toast.success("Storefront settings saved")
    } catch {
      setFeedback("Something went wrong while saving your storefront settings.")
      toast.error("Unable to save storefront settings")
    } finally {
      setIsSaving(false)
    }
  }

  const tabs = [
    { value: "branding", label: "Branding" },
    { value: "theme", label: "Theme & layout" },
    { value: "home", label: "Home" },
    { value: "navigation", label: "Navigation & features" },
    { value: "footer", label: "Footer & contact" },
    { value: "seo", label: "SEO" },
  ] as const

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "24px" }}>
      <div style={{ marginBottom: 20 }}>
        <Heading level="h2">Storefront settings</Heading>
        <Text size="small" className="text-ui-fg-subtle" style={{ marginTop: 8 }}>
          Shape the storefront your customers will see: brand, theme, layout, home
          content, navigation, features, footer and SEO.
        </Text>
      </div>

      <form onSubmit={handleSubmit}>
        <Tabs defaultValue="branding">
          <Tabs.List>
            {tabs.map((tab) => (
              <Tabs.Trigger key={tab.value} value={tab.value}>
                {tab.label}
              </Tabs.Trigger>
            ))}
          </Tabs.List>

          <Tabs.Content value="branding">
            <Container style={{ marginTop: 16, padding: 24 }}>
              <BrandingSection settings={settings} updateBrand={updateBrand} />
            </Container>
          </Tabs.Content>

          <Tabs.Content value="theme">
            <Container style={{ marginTop: 16, padding: 24 }}>
              <ThemeLayoutSection
                settings={settings}
                updateTheme={updateTheme}
                updateLayout={updateLayout}
              />
            </Container>
          </Tabs.Content>

          <Tabs.Content value="home">
            <Container style={{ marginTop: 16, padding: 24 }}>
              <HomeSection settings={settings} updateHomepage={updateHomepage} />
            </Container>
          </Tabs.Content>

          <Tabs.Content value="navigation">
            <Container style={{ marginTop: 16, padding: 24 }}>
              <NavigationFeaturesSection
                settings={settings}
                updateNavigation={updateNavigation}
                updateFeatures={updateFeatures}
              />
            </Container>
          </Tabs.Content>

          <Tabs.Content value="footer">
            <Container style={{ marginTop: 16, padding: 24 }}>
              <FooterContactSection settings={settings} updateFooter={updateFooter} />
            </Container>
          </Tabs.Content>

          <Tabs.Content value="seo">
            <Container style={{ marginTop: 16, padding: 24 }}>
              <SeoSection settings={settings} updateSeo={updateSeo} />
            </Container>
          </Tabs.Content>
        </Tabs>

        <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 24 }}>
          <Button type="submit" disabled={isSaving || isLoading}>
            {isSaving ? "Saving..." : "Save storefront settings"}
          </Button>
          {feedback ? <Text size="small">{feedback}</Text> : null}
        </div>
      </form>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Storefront",
  rank: 120,
})

export default StorefrontSettingsPage
