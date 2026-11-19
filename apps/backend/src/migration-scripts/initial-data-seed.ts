import { MedusaContainer } from "@medusajs/framework";
import { DEFAULT_REGION_STORE_POLICIES } from "../lib/region-store-policies";
import {
  ContainerRegistrationKeys,
  ModuleRegistrationName,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils";
import {
  createApiKeysWorkflow,
  createCollectionsWorkflow,
  createInventoryLevelsWorkflow,
  createProductCategoriesWorkflow,
  createProductOptionsWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  createStoresWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
} from "@medusajs/medusa/core-flows";

export default async function initial_data_seed({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const link = container.resolve(ContainerRegistrationKeys.LINK);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const fulfillmentModuleService = container.resolve(
    ModuleRegistrationName.FULFILLMENT
  );

  // Idempotency: skip if the store has already been seeded (e.g. ng region
  // exists or a default store/currency setup is present). This avoids failing
  // on retries or existing databases where countries are already assigned.
  try {
    const { data: existingRegions } = await query.graph({
      entity: "region",
      fields: ["id", "countries.iso_2"],
    });
    const hasNgRegion = (existingRegions || []).some((region: any) =>
      (region.countries || []).some(
        (c: any) => (c.iso_2 || "").toLowerCase() === "ng"
      )
    );
    const storeModuleService = container.resolve(Modules.STORE);
    const [existingStore] = await storeModuleService.listStores({}, { take: 1 });
    const hasSeededStore =
      existingStore &&
      Array.isArray((existingStore as any).supported_currencies) &&
      (existingStore as any).supported_currencies.length > 0;

    if (hasNgRegion || hasSeededStore) {
      logger.info(
        "Initial data already seeded (NG region/store present). Skipping."
      );
      return;
    }
  } catch (e) {
    // If idempotency check fails (e.g. modules not ready), attempt to proceed
    // but guard region creation below.
    logger.warn(
      `Initial seed idempotency check failed, proceeding: ${(e as Error)?.message ?? e}`
    );
  }

  const countries = ["ng"];

  logger.info("Seeding store data...");
  const {
    result: [defaultSalesChannel],
  } = await createSalesChannelsWorkflow(container).run({
    input: {
      salesChannelsData: [
        {
          name: "Default Sales Channel",
          description: "Created by Medusa",
        },
      ],
    },
  });

  const {
    result: [publishableApiKey],
  } = await createApiKeysWorkflow(container).run({
    input: {
      api_keys: [
        {
          title: "Default Publishable API Key",
          type: "publishable",
          created_by: "",
        },
      ],
    },
  });

  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: {
      id: publishableApiKey.id,
      add: [defaultSalesChannel.id],
    },
  });

  const {
    result: [store],
  } = await createStoresWorkflow(container).run({
    input: {
      stores: [
        {
          name: "Default Store",
          supported_currencies: [
            {
              currency_code: "ngn",
              is_default: true,
            },
          ],
          default_sales_channel_id: defaultSalesChannel.id,
        },
      ],
    },
  });

  logger.info("Seeding region data...");
  let region: any;
  const { data: regionsBeforeCreate } = await query.graph({
    entity: "region",
    fields: ["id", "name", "countries.iso_2"],
  });
  region = (regionsBeforeCreate || []).find((r: any) =>
    (r.countries || []).some((c: any) => (c.iso_2 || "").toLowerCase() === "ng")
  );

  if (!region) {
    try {
      const { result: regionResult } = await createRegionsWorkflow(container).run({
        input: {
          regions: [
            {
              name: "Nigeria",
              currency_code: "ngn",
              countries,
              payment_providers: ["pp_system_default"],
              metadata: DEFAULT_REGION_STORE_POLICIES,
            },
          ],
        },
      });
      region = regionResult[0];
      logger.info("Finished seeding regions.");
    } catch (e) {
      const message = (e as Error)?.message || String(e);
      if (message.toLowerCase().includes("already assigned to a region")) {
        const { data: regionsAfter } = await query.graph({
          entity: "region",
          fields: ["id", "name", "countries.iso_2"],
        });
        region = (regionsAfter || []).find((r: any) =>
          (r.countries || []).some(
            (c: any) => (c.iso_2 || "").toLowerCase() === "ng"
          )
        );
        if (region) {
          logger.info("Nigeria region already exists, continuing seed.");
        } else {
          throw e;
        }
      } else {
        throw e;
      }
    }
  } else {
    logger.info(`Nigeria region already exists (${region.id}), skipping creation.`);
  }

  logger.info("Seeding tax regions...");
  await createTaxRegionsWorkflow(container).run({
    input: countries.map((country_code) => ({
      country_code,
      provider_id: "tp_system",
    })),
  });
  logger.info("Finished seeding tax regions.");

  logger.info("Seeding stock location data...");
  const { result: stockLocationResult } = await createStockLocationsWorkflow(
    container
  ).run({
    input: {
      locations: [
        {
          name: "Nigeria Warehouse",
          address: {
            city: "Lagos",
            country_code: "NG",
            address_1: "",
          },
        },
      ],
    },
  });
  const stockLocation = stockLocationResult[0];

  await link.create({
    [Modules.STOCK_LOCATION]: {
      stock_location_id: stockLocation.id,
    },
    [Modules.FULFILLMENT]: {
      fulfillment_provider_id: "manual_manual",
    },
  });

  logger.info("Seeding fulfillment data...");
  // This is created by a migration script in core.
  const { data: shippingProfileResult } = await query.graph({
    entity: "shipping_profile",
    fields: ["id"],
  });
  const shippingProfile = shippingProfileResult[0];

  const fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
    name: "Nigeria Warehouse delivery",
    type: "shipping",
    service_zones: [
      {
        name: "Nigeria",
        geo_zones: [
          {
            country_code: "ng",
            type: "country",
          },
        ],
      },
    ],
  });

  await link.create({
    [Modules.STOCK_LOCATION]: {
      stock_location_id: stockLocation.id,
    },
    [Modules.FULFILLMENT]: {
      fulfillment_set_id: fulfillmentSet.id,
    },
  });

  await createShippingOptionsWorkflow(container).run({
    input: [
      {
        name: "Standard Shipping",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: fulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Standard",
          description: "Ship in 2-5 days.",
          code: "standard",
        },
        prices: [
          {
            currency_code: "ngn",
            amount: 2500,
          },
          {
            region_id: region.id,
            amount: 2500,
          },
        ],
        rules: [
          {
            attribute: "enabled_in_store",
            value: "true",
            operator: "eq",
          },
          {
            attribute: "is_return",
            value: "false",
            operator: "eq",
          },
        ],
      },
      {
        name: "Express Shipping",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: fulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Express",
          description: "Ship in 1-2 days.",
          code: "express",
        },
        prices: [
          {
            currency_code: "ngn",
            amount: 5000,
          },
          {
            region_id: region.id,
            amount: 5000,
          },
        ],
        rules: [
          {
            attribute: "enabled_in_store",
            value: "true",
            operator: "eq",
          },
          {
            attribute: "is_return",
            value: "false",
            operator: "eq",
          },
        ],
      },
    ],
  });
  logger.info("Finished seeding fulfillment data.");

  await linkSalesChannelsToStockLocationWorkflow(container).run({
    input: {
      id: stockLocation.id,
      add: [defaultSalesChannel.id],
    },
  });
  logger.info("Finished seeding stock location data.");

  logger.info("Seeding product data...");

  const { result: categoryResult } = await createProductCategoriesWorkflow(
    container
  ).run({
    input: {
      product_categories: [
        {
          name: "Shirts",
          is_active: true,
        },
        {
          name: "Sweatshirts",
          is_active: true,
        },
        {
          name: "Pants",
          is_active: true,
        },
        {
          name: "Merch",
          is_active: true,
        },
      ],
    },
  });

  const { result: productOptionsResult } = await createProductOptionsWorkflow(
    container
  ).run({
    input: {
      product_options: [
        {
          title: "Size",
          values: ["S", "M", "L", "XL"],
        },
        {
          title: "Color",
          values: ["Black", "White"],
        },
      ],
    },
  });
  const sizeOption = productOptionsResult.find((o) => o.title === "Size")!;
  const colorOption = productOptionsResult.find((o) => o.title === "Color")!;

  await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: "Medusa T-Shirt",
          category_ids: [
            categoryResult.find((cat) => cat.name === "Shirts")!.id,
          ],
          description:
            "Reimagine the feeling of a classic T-shirt. With our cotton T-shirts, everyday essentials no longer have to be ordinary.",
          handle: "t-shirt",
          weight: 400,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          images: [
            {
              url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/tee-black-front.png",
            },
            {
              url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/tee-black-back.png",
            },
            {
              url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/tee-white-front.png",
            },
            {
              url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/tee-white-back.png",
            },
          ],
          options: [{ id: sizeOption.id }, { id: colorOption.id }],
          variants: [
            {
              title: "S / Black",
              sku: "SHIRT-S-BLACK",
              options: { Size: "S", Color: "Black" },
              prices: [{ amount: 15000, currency_code: "ngn" }],
            },
            {
              title: "S / White",
              sku: "SHIRT-S-WHITE",
              options: { Size: "S", Color: "White" },
              prices: [{ amount: 15000, currency_code: "ngn" }],
            },
            {
              title: "M / Black",
              sku: "SHIRT-M-BLACK",
              options: { Size: "M", Color: "Black" },
              prices: [{ amount: 15000, currency_code: "ngn" }],
            },
            {
              title: "M / White",
              sku: "SHIRT-M-WHITE",
              options: { Size: "M", Color: "White" },
              prices: [{ amount: 15000, currency_code: "ngn" }],
            },
            {
              title: "L / Black",
              sku: "SHIRT-L-BLACK",
              options: { Size: "L", Color: "Black" },
              prices: [{ amount: 15000, currency_code: "ngn" }],
            },
            {
              title: "L / White",
              sku: "SHIRT-L-WHITE",
              options: { Size: "L", Color: "White" },
              prices: [{ amount: 15000, currency_code: "ngn" }],
            },
            {
              title: "XL / Black",
              sku: "SHIRT-XL-BLACK",
              options: { Size: "XL", Color: "Black" },
              prices: [{ amount: 15000, currency_code: "ngn" }],
            },
            {
              title: "XL / White",
              sku: "SHIRT-XL-WHITE",
              options: { Size: "XL", Color: "White" },
              prices: [{ amount: 15000, currency_code: "ngn" }],
            },
          ],
          sales_channels: [{ id: defaultSalesChannel.id }],
        },
        {
          title: "Medusa Sweatshirt",
          category_ids: [
            categoryResult.find((cat) => cat.name === "Sweatshirts")!.id,
          ],
          description:
            "Reimagine the feeling of a classic sweatshirt. With our cotton sweatshirt, everyday essentials no longer have to be ordinary.",
          handle: "sweatshirt",
          weight: 400,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          images: [
            {
              url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/sweatshirt-vintage-front.png",
            },
            {
              url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/sweatshirt-vintage-back.png",
            },
          ],
          options: [{ id: sizeOption.id }],
          variants: [
            {
              title: "S",
              sku: "SWEATSHIRT-S",
              options: { Size: "S" },
              prices: [{ amount: 25000, currency_code: "ngn" }],
            },
            {
              title: "M",
              sku: "SWEATSHIRT-M",
              options: { Size: "M" },
              prices: [{ amount: 25000, currency_code: "ngn" }],
            },
            {
              title: "L",
              sku: "SWEATSHIRT-L",
              options: { Size: "L" },
              prices: [{ amount: 25000, currency_code: "ngn" }],
            },
            {
              title: "XL",
              sku: "SWEATSHIRT-XL",
              options: { Size: "XL" },
              prices: [{ amount: 25000, currency_code: "ngn" }],
            },
          ],
          sales_channels: [{ id: defaultSalesChannel.id }],
        },
        {
          title: "Medusa Sweatpants",
          category_ids: [
            categoryResult.find((cat) => cat.name === "Pants")!.id,
          ],
          description:
            "Reimagine the feeling of classic sweatpants. With our cotton sweatpants, everyday essentials no longer have to be ordinary.",
          handle: "sweatpants",
          weight: 400,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          images: [
            {
              url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/sweatpants-gray-front.png",
            },
            {
              url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/sweatpants-gray-back.png",
            },
          ],
          options: [{ id: sizeOption.id }],
          variants: [
            {
              title: "S",
              sku: "SWEATPANTS-S",
              options: { Size: "S" },
              prices: [{ amount: 20000, currency_code: "ngn" }],
            },
            {
              title: "M",
              sku: "SWEATPANTS-M",
              options: { Size: "M" },
              prices: [{ amount: 20000, currency_code: "ngn" }],
            },
            {
              title: "L",
              sku: "SWEATPANTS-L",
              options: { Size: "L" },
              prices: [{ amount: 20000, currency_code: "ngn" }],
            },
            {
              title: "XL",
              sku: "SWEATPANTS-XL",
              options: { Size: "XL" },
              prices: [{ amount: 20000, currency_code: "ngn" }],
            },
          ],
          sales_channels: [{ id: defaultSalesChannel.id }],
        },
        {
          title: "Medusa Shorts",
          category_ids: [
            categoryResult.find((cat) => cat.name === "Merch")!.id,
          ],
          description:
            "Reimagine the feeling of classic shorts. With our cotton shorts, everyday essentials no longer have to be ordinary.",
          handle: "shorts",
          weight: 400,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          images: [
            {
              url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/shorts-vintage-front.png",
            },
            {
              url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/shorts-vintage-back.png",
            },
          ],
          options: [{ id: sizeOption.id }],
          variants: [
            {
              title: "S",
              sku: "SHORTS-S",
              options: { Size: "S" },
              prices: [{ amount: 12000, currency_code: "ngn" }],
            },
            {
              title: "M",
              sku: "SHORTS-M",
              options: { Size: "M" },
              prices: [{ amount: 12000, currency_code: "ngn" }],
            },
            {
              title: "L",
              sku: "SHORTS-L",
              options: { Size: "L" },
              prices: [{ amount: 12000, currency_code: "ngn" }],
            },
            {
              title: "XL",
              sku: "SHORTS-XL",
              options: { Size: "XL" },
              prices: [{ amount: 12000, currency_code: "ngn" }],
            },
          ],
          sales_channels: [{ id: defaultSalesChannel.id }],
        },
      ],
    },
  });
  logger.info("Finished seeding product data.");

  logger.info("Seeding inventory levels.");

  const { data: inventoryItems } = await query.graph({
    entity: "inventory_item",
    fields: ["id"],
  });

  await createInventoryLevelsWorkflow(container).run({
    input: {
      inventory_levels: inventoryItems.map((item) => ({
        location_id: stockLocation.id,
        stocked_quantity: 1000000,
        inventory_item_id: item.id,
      })),
    },
  });

  logger.info("Finished seeding inventory levels data.");
}
