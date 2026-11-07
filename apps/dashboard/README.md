# Flowcheq Commerce control-plane dashboard

Next.js (App Router) application for the Flowcheq staff area.

## Status

Phase 8 of the build guide (staff dashboard). Only the app shell is in place
right now; the staff auth, tenant views, provisioning controls and deployment
automation land in later Phase 8 increments.

## Run

```bash
npm run dev --workspace=@dtc/dashboard     # http://localhost:9000
npm run build --workspace=@dtc/dashboard
npm run start --workspace=@dtc/dashboard
npm run lint --workspace=@dtc/dashboard
```

The dashboard talks to the control plane (Postgres + Redis + queue) and to the
Medusa backend through the same env vars documented in the repository
`.env.example`. Tenant secrets are stored encrypted in the control-plane
database (Phase 12).
