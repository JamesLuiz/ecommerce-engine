import { build } from "esbuild"

/**
 * Dual-format build for the shared storefront settings package.
 *
 * - `dist/index.js` (CJS) — consumed by the Medusa backend (Node, `require`).
 * - `dist/index.mjs` (ESM) — consumed by browser bundlers: the Medusa admin
 *   (Vite) and the Next.js storefront. ESM gives them statically analyzable
 *   named exports; a raw CJS file breaks `import { X }` in those pipelines.
 *
 * Type declarations still come from `tsc` (see `npm run build:types`).
 * `zod` stays external in both formats — every consumer already depends on it
 * and bundling a second copy would break `instanceof` checks on schemas.
 */

const shared = {
  entryPoints: ["src/index.ts"],
  bundle: true,
  platform: "neutral",
  target: "es2022",
  external: ["zod"],
  logLevel: "info",
}

await build({
  ...shared,
  format: "cjs",
  outfile: "dist/index.js",
})

await build({
  ...shared,
  format: "esm",
  outfile: "dist/index.mjs",
})
