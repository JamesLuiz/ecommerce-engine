import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import {
  createRegionsWorkflow,
  createTaxRegionsWorkflow,
  updateProductVariantsWorkflow,
  updateRegionsWorkflow,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows";
import { DEFAULT_REGION_STORE_POLICIES } from "../lib/region-store-policies";

const SYSTEM_PAYMENT_PROVIDER = "pp_system_default";
const SYSTEM_TAX_PROVIDER = "tp_system";

/**
 * Converges first-time setup data to Nigeria / Naira.
 *
 * Early databases were seeded with a Europe region (Denmark and friends,
 * EUR/USD). That is why the storefront country picker showed Denmark and
 * defaulted to "dk". This script runs once via `medusa db:migrate` and:
 * - ensures a region containing Nigeria ("ng") exists with NGN,
 * - repurposes the legacy starter region (Europe / Denmark) when present,
 * - ensures the store lists NGN (Naira) and uses it as the default currency,
 * - points the store default region at Nigeria so fresh setups land on "ng".
 */
export default async function nigeriaRegionDefault({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const { data: regions } = await query.graph({
    entity: "region",
    fields: ["id", "name", "currency_code", "countries.iso_2", "metadata"],
  });

  type RegionRow = {
    id: string;
    name?: string | null;
    currency_code?: string | null;
    countries?: { iso_2?: string | null }[] | null;
    metadata?: Record<string, unknown> | null;
  };

  const countryCodes = (region: RegionRow) =>
    ((region.countries ?? []) as { iso_2?: string | null }[]).map((country) =>
      (country.iso_2 ?? "").toLowerCase()
    );

  let nigeria = (regions as RegionRow[]).find((region) =>
    countryCodes(region).includes("ng")
  );

  if (
    nigeria &&
    (nigeria.currency_code ?? "").toLowerCase() !== "ngn"
  ) {
    const { result } = await updateRegionsWorkflow(container).run({
      input: {
        selector: { id: nigeria.id },
        update: { currency_code: "ngn" },
      },
    });
    nigeria = (result[0] as RegionRow) ?? nigeria;
    logger.info(`Set region "${nigeria.name}" currency to NGN.`);
  }

  if (!nigeria) {
    const legacy = (regions as RegionRow[]).find(
      (region) =>
        region.name === "Europe" || countryCodes(region).includes("dk")
    );

    if (legacy) {
      // A country can only belong to one region, so the starter region is
      // repurposed in place instead of creating a conflicting second region.
      const { result } = await updateRegionsWorkflow(container).run({
        input: {
          selector: { id: legacy.id },
          update: {
            name: "Nigeria",
            currency_code: "ngn",
            countries: ["ng"],
            metadata: {
              ...(legacy.metadata ?? {}),
              ...DEFAULT_REGION_STORE_POLICIES,
              flowcheq_region: "ng",
            },
          },
        },
      });
      nigeria = result[0] as RegionRow;
      logger.info("Repurposed the starter region as Nigeria (NGN).");
    } else {
      const { result } = await createRegionsWorkflow(container).run({
        input: {
          regions: [
            {
              name: "Nigeria",
              currency_code: "ngn",
              countries: ["ng"],
              payment_providers: [SYSTEM_PAYMENT_PROVIDER],
              metadata: {
                ...DEFAULT_REGION_STORE_POLICIES,
                flowcheq_region: "ng",
              },
            },
          ],
        },
      });
      nigeria = result[0] as RegionRow;
      logger.info("Created the Nigeria region (NGN).");
    }
  }

  try {
    const { data: taxRegions } = await query.graph({
      entity: "tax_region",
      fields: ["id", "country_code"],
    });

    const hasNigeria = (taxRegions as { country_code?: string | null }[]).some(
      (taxRegion) => (taxRegion.country_code ?? "").toLowerCase() === "ng"
    );

    if (!hasNigeria) {
      await createTaxRegionsWorkflow(container).run({
        input: [{ country_code: "ng", provider_id: SYSTEM_TAX_PROVIDER }],
      });
      logger.info("Created the Nigeria tax region.");
    }
  } catch (error) {
    logger.warn(
      `Skipped the Nigeria tax region check: ${
        (error as Error)?.message ?? error
      }`
    );
  }

  const storeService = container.resolve(Modules.STORE);
  const [store] = await storeService.listStores({}, { take: 1 });

  if (store) {
    const supported = (store.supported_currencies ?? []) as {
      currency_code?: string | null;
    }[];
    const codes = new Set(
      supported
        .map((currency) => (currency.currency_code ?? "").toLowerCase())
        .filter(Boolean)
    );
    codes.add("ngn");

    await updateStoresWorkflow(container).run({
      input: {
        selector: { id: store.id },
        update: {
          supported_currencies: [...codes].map((currency_code) => ({
            currency_code,
            is_default: currency_code === "ngn",
          })),
          default_region_id: nigeria.id,
        },
      },
    });
    logger.info(
      "Set the store default currency to NGN and the default region to Nigeria."
    );
  }

  // Ensure existing product variants have NGN prices for the Nigeria region so
  // products remain purchasable after switching from legacy currencies/regions.
  try {
    const { data: variants } = await query.graph({
      entity: "product_variant",
      fields: ["id"],
    });

    const variantIds = (variants || [])
      .map((variant: { id?: string }) => variant.id)
      .filter((id): id is string => Boolean(id));

    const batchSize = 100;
    for (let i = 0; i < variantIds.length; i += batchSize) {
      const batch = variantIds.slice(i, i + batchSize);
      await updateProductVariantsWorkflow(container).run({
        input: {
          product_variants: batch.map((id) => ({
            id,
            prices: [{ amount: 100, currency_code: "ngn" }],
          })),
        },
      });
    }

    if (variantIds.length > 0) {
      logger.info(
        `Ensured NGN (₦100) prices for ${variantIds.length} product variant(s).`
      );
    }
  } catch (error) {
    logger.warn(
      `Skipped NGN price backfill for existing variants: ${
        (error as Error)?.message ?? error
      }`
    );
  }
}
