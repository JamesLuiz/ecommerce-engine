/**
 * Rebrand the compiled Medusa Admin for Flowcheq Commerce.
 *
 * Medusa exposes no config option for the admin logo, name, favicon or
 * accent colours, so we patch the compiled packages in place and freeze the
 * result with `patch-package` (see patches/). Re-run this script after
 * upgrading @medusajs/dashboard or @medusajs/admin-bundler, then regenerate
 * the patches.
 *
 * Values can be overridden at patch time with environment variables, but the
 * frozen patch stores the concrete values. Re-run + regenerate the patch if
 * the brand changes.
 */

const fs = require("fs")
const path = require("path")

const BRAND = {
  name: process.env.ADMIN_BRAND_NAME || "Flowcheq",
  primary: process.env.ADMIN_BRAND_PRIMARY || "#5B4FF9",
  primaryDark: process.env.ADMIN_BRAND_PRIMARY_DARK || "#8C7CFF",
  primaryHover: process.env.ADMIN_BRAND_PRIMARY_HOVER || "#4A3FE0",
  primaryDarkHover: process.env.ADMIN_BRAND_PRIMARY_DARK_HOVER || "#A79BFF",
  primaryPressed: process.env.ADMIN_BRAND_PRIMARY_PRESSED || "#3A31C9",
  primaryDarkPressed: process.env.ADMIN_BRAND_PRIMARY_DARK_PRESSED || "#6F5FE0",
}

// A blocky "F" monogram, drawn on a 400x400 canvas. The same shape is reused
// (scaled) for the 36x38 reset-password logo and the favicon.
const LOGO_PATH_400 =
  "M130 95H275V145H190V185H260V235H190V305H130Z"
const LOGO_PATH_36 =
  "M12 7H27V12H18V16H25V21H18V31H12Z"

const FAVICON = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400'%3E%3Crect width='400' height='400' rx='88' fill='${encodeURIComponent(
  BRAND.primary
)}'/%3E%3Cpath d='${LOGO_PATH_400}' fill='white'/%3E%3C/svg%3E`

const DASHBOARD_DIR = path.join(
  __dirname,
  "node_modules",
  "@medusajs",
  "dashboard",
  "dist"
)
const BUNDLER_DIR = path.join(
  __dirname,
  "node_modules",
  "@medusajs",
  "admin-bundler",
  "dist"
)

const swap = (filePath, replacements) => {
  if (!fs.existsSync(filePath)) return

  let source = fs.readFileSync(filePath, "utf8")
  const original = source

  for (const [target, replacement] of replacements) {
    source = source.split(target).join(replacement)
  }

  if (source !== original) {
    fs.writeFileSync(filePath, source)
    console.log("patched", path.relative(process.cwd(), filePath))
  }
}

const patchDashboard = () => {
  if (!fs.existsSync(DASHBOARD_DIR)) {
    console.log("Skipping Medusa dashboard patch: @medusajs/dashboard not installed")
    return
  }

  for (const file of fs.readdirSync(DASHBOARD_DIR)) {
    if (!/\.(mjs|js)$/.test(file)) continue

    const filePath = path.join(DASHBOARD_DIR, file)

    swap(filePath, [
      // Remove the Medusa name from the auth and invite pages.
      ["Welcome to Medusa", BRAND.name],
      ["Get started with Medusa Admin right away.", "Get started right away."],
      ["Start Medusa Admin", `Start ${BRAND.name} Admin`],
      ["Log in with Medusa Cloud", `Log in with ${BRAND.name} Cloud`],
      [" - Medusa", ` - ${BRAND.name}`],
      ['DEFAULT_TITLE = "Medusa"', `DEFAULT_TITLE = "${BRAND.name}"`],
    ])

    // The logo mark appears in two sizes. Replace each with the matching
    // monogram, then make the tile brand-coloured.
    swap(filePath, [
      [
        "M238.088 51.1218L238.089 51.1223L310.605 92.8101C334.028 106.308 348.526 131.32 347.868 157.953L347.867 157.966V157.978V241.688C347.867 268.68 333.687 293.362 310.271 306.856L310.269 306.858L237.754 348.878C214.336 362.374 185.643 362.374 162.225 348.878L89.7127 306.859C66.6206 293.361 52.1113 268.674 52.1113 241.688V157.978C52.1113 131.326 66.6211 106.307 89.7088 92.8093C89.7101 92.8085 89.7114 92.8078 89.7127 92.807L162.556 51.1233L162.559 51.1218C185.977 37.6261 214.67 37.6261 238.088 51.1218ZM124.634 200C124.634 241.576 158.502 275.372 200.156 275.372C242.142 275.372 276.013 241.578 276.013 200C276.013 158.419 241.805 124.628 200.156 124.628C158.502 124.628 124.634 158.424 124.634 200Z",
        LOGO_PATH_400,
      ],
      [
        "M86.7 84.2h156.1c42.8 0 77.6 34.8 77.6 77.6 0 18.9-6.6 36.1-17.7 49.8l45.7 87.1h-57.2l-34.7-67.1H159v67.1H86.7V84.2Zm72.3 71.7h88.8c23.7 0 42.9-19.2 42.9-42.9 0-23.7-19.2-42.9-42.9-42.9h-88.8v85.8Z",
        LOGO_PATH_400,
      ],
      [
        "M30.85 6.16832L22.2453 1.21782C19.4299 -0.405941 15.9801 -0.405941 13.1648 1.21782L4.52043 6.16832C1.74473 7.79208 0 10.802 0 14.0099V23.9505C0 27.198 1.74473 30.1683 4.52043 31.7921L13.1251 36.7822C15.9405 38.4059 19.3903 38.4059 22.2056 36.7822L30.8103 31.7921C33.6257 30.1683 35.3307 27.198 35.3307 23.9505V14.0099C35.41 10.802 33.6653 7.79208 30.85 6.16832ZM17.6852 27.8317C12.8079 27.8317 8.8426 23.8713 8.8426 19C8.8426 14.1287 12.8079 10.1683 17.6852 10.1683C22.5625 10.1683 26.5674 14.1287 26.5674 19C26.5674 23.8713 22.6022 27.8317 17.6852 27.8317Z",
        LOGO_PATH_36,
      ],
      [
        'width: "400", height: "400", fill: "#18181B"',
        `width: "400", height: "400", fill: "${BRAND.primary}"`,
      ],
      [
        'fill: "url(#paint0_linear_11869_12671)"',
        'fill: "#FFFFFF"',
      ],
      [
        'stroke: "url(#paint1_linear_11869_12671)"',
        'stroke: "none"',
      ],
      [
        "relative flex size-14 items-center justify-center rounded-xl bg-ui-button-neutral shadow-buttons-neutral",
        "relative flex size-14 items-center justify-center rounded-xl bg-ui-button-inverted shadow-buttons-neutral",
      ],
      [
        'className: "relative fill-ui-button-inverted drop-shadow-sm"',
        'className: "relative", fill: "#FFFFFF"',
      ],
    ])
  }

  const appCss = path.join(DASHBOARD_DIR, "app.css")
  if (fs.existsSync(appCss)) {
    const css = fs.readFileSync(appCss, "utf8")

    if (!css.includes("/* flowcheq-brand */")) {
      fs.appendFileSync(
        appCss,
        [
          "",
          "/* flowcheq-brand */",
          `:root{--bg-interactive:${BRAND.primary};--border-interactive:${BRAND.primary};--fg-interactive:${BRAND.primary};--fg-interactive-hover:${BRAND.primaryHover};--button-inverted:${BRAND.primary};--button-inverted-hover:${BRAND.primaryHover};--button-inverted-pressed:${BRAND.primaryPressed}}`,
          `.dark{--bg-interactive:${BRAND.primaryDark};--border-interactive:${BRAND.primaryDark};--fg-interactive:${BRAND.primaryDark};--fg-interactive-hover:${BRAND.primaryDarkHover};--button-inverted:${BRAND.primaryDark};--button-inverted-hover:${BRAND.primaryDarkHover};--button-inverted-pressed:${BRAND.primaryDarkPressed}}`,
          "",
        ].join("\n")
      )
      console.log("patched", path.relative(process.cwd(), appCss))
    }
  }
}

const patchBundler = () => {
  if (!fs.existsSync(BUNDLER_DIR)) {
    console.log("Skipping admin bundler patch: @medusajs/admin-bundler not installed")
    return
  }

  for (const file of fs.readdirSync(BUNDLER_DIR)) {
    if (!file.endsWith(".js")) continue

    const filePath = path.join(BUNDLER_DIR, file)

    swap(filePath, [['href="data:,"', `href="${FAVICON}"`]])

    // Add a document title once. The template has no <title>, so this is the
    // only place the browser tab name comes from.
    const source = fs.readFileSync(filePath, "utf8")
    if (!source.includes("<title>")) {
      swap(filePath, [
        [
          "<html>\n        <head>",
          `<html>\n        <head>\n            <title>${BRAND.name}</title>`,
        ],
      ])
    }
  }
}

patchDashboard()
patchBundler()

console.log(`Medusa Admin rebrand applied for ${BRAND.name}.`)
