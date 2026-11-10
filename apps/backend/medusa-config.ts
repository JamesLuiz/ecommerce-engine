import { defineConfig, loadEnv } from "@medusajs/framework/utils"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

/**
 * Recover from stale Vite pre-bundled chunks.
 *
 * The admin dev server pre-bundles `@medusajs/dashboard` into hashed files
 * under `node_modules/.vite/deps`. Whenever Vite re-optimizes (a restart, a
 * patched dependency, a newly discovered import) those hashes change, but a
 * browser tab that is already open keeps the old module graph and the next
 * lazy route import fails with "Failed to fetch dynamically imported module".
 *
 * Reloading once when that happens picks up the current hashes. The timestamp
 * guard stops an endless reload loop when a chunk is genuinely unreachable.
 */
const ADMIN_CHUNK_RECOVERY_SCRIPT = `(function () {
  var KEY = "flowcheq:admin-chunk-reload";
  function reloadOnce() {
    try {
      var last = Number(sessionStorage.getItem(KEY) || 0);
      var now = Date.now();
      if (now - last < 15000) return;
      sessionStorage.setItem(KEY, String(now));
    } catch (error) {}
    window.location.reload();
  }
  function isChunkError(value) {
    var message = String(
      (value && (value.message || (value.reason && value.reason.message))) ||
        value ||
        ""
    );
    return (
      message.indexOf("Failed to fetch dynamically imported module") !== -1 ||
      message.indexOf("error loading dynamically imported module") !== -1 ||
      message.indexOf("Importing a module script failed") !== -1 ||
      message.indexOf("Outdated Optimize Dep") !== -1
    );
  }
  window.addEventListener("vite:preloadError", function (event) {
    var error = event.payload || event.error;

    if (isChunkError(error)) {
      event.preventDefault();
      reloadOnce();
    }
  });
  window.addEventListener(
    "error",
    function (event) {
      if (isChunkError(event.error || event.message)) reloadOnce();
    },
    true
  );
  window.addEventListener("unhandledrejection", function (event) {
    if (isChunkError(event.reason)) reloadOnce();
  });
})();`

module.exports = defineConfig({
  admin: {
    vite: () => ({
      // Keep the dependency graph stable for the whole session: wait for the
      // initial crawl before finalizing pre-bundles instead of re-optimizing
      // mid-navigation.
      optimizeDeps: {
        holdUntilCrawlEnd: true,
      },
      server: {
        // Pre-transform the generated admin entry at startup so the first
        // navigation does not discover new deps and trigger a re-optimize.
        warmup: {
          clientFiles: ["./entry.jsx"],
        },
      },
      plugins: [
        {
          name: "flowcheq-admin-chunk-recovery",
          transformIndexHtml: (html: string) => ({
            html,
            tags: [
              {
                tag: "script",
                attrs: { type: "text/javascript" },
                children: ADMIN_CHUNK_RECOVERY_SCRIPT,
                injectTo: "head-prepend" as const,
              },
            ],
          }),
        },
      ],
    }),
  },
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    databaseDriverOptions: {
      pool: {
        min: 0,
        max: Number(process.env.DB_POOL_MAX ?? 5),
        idleTimeoutMillis: 10000,
        acquireTimeoutMillis: 60000,
      },
      connection: {
        ssl:
          process.env.DB_SSL === "true"
            ? { rejectUnauthorized: false }
            : false,
      },
    },
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET,
      cookieSecret: process.env.COOKIE_SECRET,
    },
  },
  modules: [
    {
      resolve: "./src/modules/storefront-asset",
    },
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          {
            resolve: "./src/providers/payment-paystack",
            id: "paystack",
            options: {
              publicKey:
                process.env.PAYSTACK_PUBLIC_KEY || "pk_test_local_placeholder",
              secretKey:
                process.env.PAYSTACK_SECRET_KEY || "sk_test_local_placeholder",
              webhookSecret:
                process.env.PAYSTACK_WEBHOOK_SECRET || "whsec_local_placeholder",
            },
          },
          {
            resolve: "./src/providers/payment-flutterwave",
            id: "flutterwave",
            options: {
              publicKey:
                process.env.FLUTTERWAVE_PUBLIC_KEY || "FLWPUBK_TEST_local_placeholder",
              secretKey:
                process.env.FLUTTERWAVE_SECRET_KEY || "FLWSECK_TEST_local_placeholder",
              webhookSecret:
                process.env.FLUTTERWAVE_WEBHOOK_SECRET || "flutterwave_local_placeholder",
            },
          },
        ],
      },
    },
  ],
})
