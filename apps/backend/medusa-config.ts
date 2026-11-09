import { defineConfig, loadEnv } from "@medusajs/framework/utils"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

module.exports = defineConfig({
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
