# Admin Customizations

You can extend the Medusa Admin to add widgets and new pages. Your customizations interact with API routes to provide merchants with custom functionalities.

> Learn more about Admin Extensions in [this documentation](https://docs.medusajs.com/learn/fundamentals/admin).

## Example: Create a Widget

A widget is a React component that can be injected into an existing page in the admin dashboard.

For example, create the file `src/admin/widgets/product-widget.tsx` with the following content:

```tsx title="src/admin/widgets/product-widget.tsx"
import { defineWidgetConfig } from "@medusajs/admin-sdk"

// The widget
const ProductWidget = () => {
  return (
    <div>
      <h2>Product Widget</h2>
    </div>
  )
}

// The widget's configurations
export const config = defineWidgetConfig({
  zone: "product.details.after",
})

export default ProductWidget
```

This inserts a widget with the text “Product Widget” at the end of a product’s details page.

## Branding

The compiled Medusa Admin is rebranded for Flowcheq Commerce. Medusa exposes no
runtime option for the admin logo, product name, favicon or accent colours, so
the build patches the compiled `@medusajs/dashboard` and
`@medusajs/admin-bundler` packages and freezes the result with `patch-package`.

What changes:

- The auth and invite headings no longer say "Welcome to Medusa"; they show the
  brand name.
- The Medusa mark on the login, invite and reset-password pages is replaced by
  the brand monogram.
- The browser tab title is `Page - Flowcheq`, and the initial document title and
  favicon are branded.
- Interactive/primary colours use the brand palette in both light and dark mode.

The patches live in `patches/` and are applied automatically by the root
`postinstall` script (`patch-package`). Every app Dockerfile copies `patches/`
before `npm ci`, so the tenant image is built with the rebrand applied.

### Changing the brand

Brand values are read at patch time by `brand.cjs` from these optional
environment variables (defaults in parentheses):

| Variable | Default |
| --- | --- |
| `ADMIN_BRAND_NAME` | `Flowcheq` |
| `ADMIN_BRAND_PRIMARY` | `#5B4FF9` |
| `ADMIN_BRAND_PRIMARY_DARK` | `#8C7CFF` |
| `ADMIN_BRAND_PRIMARY_HOVER` | `#4A3FE0` |
| `ADMIN_BRAND_PRIMARY_DARK_HOVER` | `#A79BFF` |
| `ADMIN_BRAND_PRIMARY_PRESSED` | `#3A31C9` |
| `ADMIN_BRAND_PRIMARY_DARK_PRESSED` | `#6F5FE0` |

The frozen patch stores the concrete values, so changing the brand means:

1. Reinstall the two packages at their pinned versions (`npm install`).
2. Set the variables and run `npm run brand:dashboard`.
3. Regenerate the patches:
   `npx patch-package @medusajs/dashboard @medusajs/admin-bundler`
4. Rebuild the admin (`npm run build --workspace=@dtc/backend`).

Do this after every upgrade of `@medusajs/dashboard` or
`@medusajs/admin-bundler`, because the compiled file names and contents change
between releases.