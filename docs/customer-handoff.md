# Customer handoff: deploy on demand, hand over a brand-new store

This guide covers the full loop for **every customer**: deploy their storefront
from a fresh template, hand it to them brand-new, teach them to customize it
from the backend, and make sure they can always reset their own password.

## 1. Deploy a fresh store for a customer

1. Copy the template and fill in every `HUMAN` value (one file per customer,
   never committed):
   ```bash
   cp .env.fresh-customer.example .env.<slug>
   ```
   Generate the two secrets fresh for this customer:
   ```bash
   openssl rand -hex 32  # TENANT_JWT_SECRET
   openssl rand -hex 32  # TENANT_COOKIE_SECRET
   ```
2. Build `TENANT_CONFIG` from the slug, business name, owner email, plan,
   currency and region. The provisioner validates it with
   `@flowcheq/tenant-config` (strict zod); an invalid value aborts the
   deploy before anything is created.
3. Set the tenant Brevo variables. **Without `TENANT_BREVO_API_KEY` the owner
   never receives their invite or password-reset emails** — the links only
   appear in backend logs, which the customer cannot see.
4. Run provisioning for the paid order (dashboard: tenant page >
   **Redeploy**, or queue the provision job). Provisioning is idempotent and
   resumable: re-running it finishes an interrupted deploy instead of
   creating duplicates.
5. `bootstrap-tenant` runs inside the new backend: region, sales channel,
   `storefront` publishable key, payment configuration — then it creates the
   **owner invite** for `TENANT_OWNER_EMAIL`.
6. The `user-invite` subscriber emails the owner their accept link, or logs
   it when email is not configured (dev only). Confirm the invite email
   arrived before handing over.

They see it brand-new from there: an empty catalog, default theme, their
business name — nothing from any other tenant.

## 2. Owner onboarding (first login + password)

The owner never needs a password from staff:

1. The owner opens the invite link (valid 24h):
   `https://<tenant-admin>/app/invite?token=...`
2. Accepting the invite creates their admin account and sets their password.
3. If the invite lapses, staff resend it from **Users** in the tenant admin
   (`invite.resent` re-triggers the same email).

## 3. Owner password reset (self-serve, any time later)

After the handoff the owner resets their own password without calling staff:

1. On the admin login page (`https://<tenant-admin>/app`) they click
   **Forgot password** (routes to `/app/reset-password`).
2. They enter their email. If the account exists, the backend emits
   `auth.password_reset` and the `auth-password-reset` subscriber emails a
   link (valid **15 minutes**). The response is identical whether or not the
   email exists — emails are never enumerated.
3. They open the link (`/app/reset-password?token=...`) and choose a new
   password.

Staff never see or set the password. If the owner also loses inbox access,
create a fresh invite from **Users** in the admin instead.

## 4. Tutorial: customize the storefront from the backend

Give this section to the customer. Everything happens in the tenant admin —
no code, no redeploy.

1. Open your admin: `https://<your-store>-admin.example.store/app` and log in.
2. Go to **Settings > Storefront**. There are seven tabs:
   - **Branding** — store name, logo, favicon. Upload images under
     **Settings > Media** first, then pick them here.
   - **Theme** — light/dark/system, preset (`minimal`, `editorial`, `bold`,
     `classic`), fonts, colours, corner radius.
   - **Home** — hero headline, subtext, hero image, featured categories.
   - **Navigation** — announcement bar, menu layout (`centered`, `split`,
     `minimal`), mega-menu, search and account toggles.
   - **Footer** — columns, contact details, social links, payment badges.
   - **Media** — extra showcase images referenced by the home page.
   - **SEO** — page title template, meta description, social share image.
3. Press **Save** on each tab. The storefront reads these settings at request
   time, so changes appear immediately — no rebuild.
4. For order emails and receipts, use **Settings > Branding** (sender name,
   logo, colours used in transactional emails).
5. Add products under **Products**, create a collection, then feature it on
   the **Home** tab. Publish when ready.

## 5. Local rehearsal (staff only, never customer data)

```bash
cp .env.example .env        # fill in LOCAL values only
npm run reset:local -- --yes   # wipes LOCAL control-plane DB + Redis
npm run load:local              # migrations + starter plan + demo customer
```

Both scripts refuse to run against non-local hosts and refuse
`NODE_ENV=production`. Secrets are read from the environment and never
printed. See `scripts/env-file.mjs` for the shared loader.
