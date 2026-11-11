import { defineConfig, loadEnv } from "@medusajs/framework/utils"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

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
      optimizeDeps: {
        holdUntilCrawlEnd: true,
      },
      server: {
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
      resolve: "./src/modules/vendor-payment",
    },
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          {
            resolve: "./src/modules/paystack-gateway",
            id: "paystack-gateway",
            options: {
              gatewayUrl: process.env.GATEWAY_URL,
              gatewayToken: process.env.GATEWAY_TOKEN,
              webhookSecret: process.env.GATEWAY_WEBHOOK_SECRET,
            },
          },
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
    {
      resolve: "@medusajs/medusa/notification",
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/notification-local",
            id: "local",
            options: {
              name: "Local Notification Provider",
              channels: ["feed"],
            },
          },
          ...(process.env.BREVO_API_KEY
            ? [
                {
                  resolve: "./src/providers/notification-brevo",
                  id: "brevo",
                  options: {
                    channels: ["email"],
                    apiKey: process.env.BREVO_API_KEY,
                    fromEmail: process.env.BREVO_FROM_EMAIL,
                    fromName: process.env.BREVO_FROM_NAME,
                  },
                },
              ]
            : []),
        ],
      },
    },
  ],
})
