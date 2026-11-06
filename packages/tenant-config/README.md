# @flowcheq/tenant-config

Shared `zod` schema for a tenant's configuration. Imported by the dashboard, the
provisioner and the Medusa bootstrap script so every boundary validates the same
shape.

## Usage

```ts
import { TenantConfig } from "@flowcheq/tenant-config"

const config = TenantConfig.parse(JSON.parse(process.env.TENANT_CONFIG!))
```

`TenantConfig` also carries defaults for `currency`, `region`, `brand` and
`features`. `RESERVED_SLUGS` lists names that may not be used as a store slug.

## Run and test

```bash
npm run build -w @flowcheq/tenant-config
npm run test -w @flowcheq/tenant-config
```

The package is CommonJS so the Medusa backend (`medusa exec`) can `require` it
at runtime. `zod` is the only runtime dependency.
