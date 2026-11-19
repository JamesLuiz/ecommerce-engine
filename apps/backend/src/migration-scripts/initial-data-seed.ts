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

  const countries = ["ng"];

  logger.info("Seeding store data...");
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL);
  const apiKeyModuleService = container.resolve(Modules.API_KEY);
  const storeModuleService = container.resolve(Modules.STORE);

  let defaultSalesChannel: any;
  try {
    const existingSalesChannels = await salesChannelModuleService.listSalesChannels(
      { name: "Default Sales Channel" },
      { take: 1 }
    );
    defaultSalesChannel = existingSalesChannels?.[0];
  } catch {
    // ignore and create below
  }
  if (!defaultSalesChannel) {
    const {
      result: [createdSalesChannel],
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
    defaultSalesChannel = createdSalesChannel;
  }

  let publishableApiKey: any;
  try {
    const existingApiKeys = await apiKeyModuleService.listApiKeys(
      { type: "publishable", title: "Default Publishable API Key" },
      { take: 1 }
    );
    publishableApiKey = existingApiKeys?.[0];
  } catch {
    // ignore and create below
  }
  if (!publishableApiKey) {
    const {
      result: [createdApiKey],
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
    publishableApiKey = createdApiKey;
  }

  try {
    await linkSalesChannelsToApiKeyWorkflow(container).run({
      input: {
        id: publishableApiKey.id,
        add: [defaultSalesChannel.id],
      },
    });
  } catch (e) {
    logger.warn(
      `Skipping sales channel/api key link (may already exist): ${(e as Error)?.message ?? e}`
    );
  }

  let store: any;
  try {
    const [existingStore] = await storeModuleService.listStores({}, { take: 1 });
    store = existingStore;
  } catch {
    // ignore and create below
  }
  if (!store) {
    const {
      result: [createdStore],
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
    store = createdStore;
  } else {
    // Ensure NGN is supported/default and sales channel is set when possible.
    try {
      await storeModuleService.updateStores(store.id, {
        default_sales_channel_id:
          store.default_sales_channel_id || defaultSalesChannel.id,
        supported_currencies: [
          {
            currency_code: "ngn",
            is_default: true,
          },
        ],
      });
      const [updatedStore] = await storeModuleService.listStores(
        { id: store.id },
        { take: 1 }
      );
      store = updatedStore || store;
    } catch (e) {
      logger.warn(
        `Could not update existing store during seed: ${(e as Error)?.message ?? e}`
      );
    }
  }

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
  try {
    await createTaxRegionsWorkflow(container).run({
      input: countries.map((country_code) => ({
        country_code,
        provider_id: "tp_system",
      })),
    });
    logger.info("Finished seeding tax regions.");
  } catch (e) {
    logger.warn(
      `Skipping tax region seed (may already exist): ${(e as Error)?.message ?? e}`
    );
  }

  logger.info("Seeding stock location data...");
  let stockLocation: any;
  try {
    const { data: existingStockLocations } = await query.graph({
      entity: "stock_location",
      fields: ["id", "name"],
    });
    stockLocation = (existingStockLocations || []).find(
      (loc: any) => loc.name === "Nigeria Warehouse"
    );
  } catch {
    // ignore
  }

  if (!stockLocation) {
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
    stockLocation = stockLocationResult[0];
  }

  try {
    await link.create({
      [Modules.STOCK_LOCATION]: {
        stock_location_id: stockLocation.id,
      },
      [Modules.FULFILLMENT]: {
        fulfillment_provider_id: "manual_manual",
      },
    });
  } catch (e) {
    logger.warn(
      `Skipping stock location/fulfillment provider link (may already exist): ${(e as Error)?.message ?? e}`
    );
  }

  logger.info("Seeding fulfillment data...");
  // This is created by a migration script in core.
  const { data: shippingProfileResult } = await query.graph({
    entity: "shipping_profile",
    fields: ["id"],
  });
  const shippingProfile = shippingProfileResult[0];

  try {
    let fulfillmentSet: any;
    try {
      const existingSets = await fulfillmentModuleService.listFulfillmentSets(
        { name: "Nigeria Warehouse delivery" },
        { relations: ["service_zones"] }
      );
      fulfillmentSet = existingSets?.[0];
    } catch {
      // ignore
    }

    if (!fulfillmentSet) {
      fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
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
    }

    try {
      await link.create({
        [Modules.STOCK_LOCATION]: {
          stock_location_id: stockLocation.id,
        },
        [Modules.FULFILLMENT]: {
          fulfillment_set_id: fulfillmentSet.id,
        },
      });
    } catch (e) {
      logger.warn(
        `Skipping stock location/fulfillment set link (may already exist): ${(e as Error)?.message ?? e}`
      );
    }

    const serviceZoneId =
      fulfillmentSet.service_zones?.[0]?.id ||
      (await fulfillmentModuleService.listFulfillmentSets(
        { id: fulfillmentSet.id },
        { relations: ["service_zones"] }
      ))?.[0]?.service_zones?.[0]?.id;

    if (serviceZoneId) {
      try {
        await createShippingOptionsWorkflow(container).run({
          input: [
            {
              name: "Standard Shipping",
              price_type: "flat",
              provider_id: "manual_manual",
              service_zone_id: serviceZoneId,
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
              service_zone_id: serviceZoneId,
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
      } catch (e) {
        logger.warn(
          `Skipping shipping option seed (may already exist): ${(e as Error)?.message ?? e}`
        );
      }
    }
    logger.info("Finished seeding fulfillment data.");
  } catch (e) {
    logger.warn(
      `Skipping fulfillment/shipping seed due to error: ${(e as Error)?.message ?? e}`
    );
  }

  try {
    await linkSalesChannelsToStockLocationWorkflow(container).run({
      input: {
        id: stockLocation.id,
        add: [defaultSalesChannel.id],
      },
    });
  } catch (e) {
    logger.warn(
      `Skipping sales channel/stock location link (may already exist): ${(e as Error)?.message ?? e}`
    );
  }
  logger.info("Finished seeding stock location data.");

  logger.info("Seeding product data...");

  let categoryResult: any[] = [];
  try {
    const { data: existingCategories } = await query.graph({
      entity: "product_category",
      fields: ["id", "name"],
    });
    if (existingCategories && existingCategories.length > 0) {
      categoryResult = existingCategories as any[];
      logger.info("Product categories already exist, skipping creation.");
    } else {
      const { result } = await createProductCategoriesWorkflow(container).run({
        input: {
          product_categories: [
            { name: "Shirts", is_active: true },
            { name: "Sweatshirts", is_active: true },
            { name: "Pants", is_active: true },
            { name: "Merch", is_active: true },
          ],
        },
      });
      categoryResult = result;
    }
  } catch (e) {
    logger.warn(
      `Skipping category seed due to error: ${(e as Error)?.message ?? e}`
    );
    const { data: existingCategories } = await query.graph({
      entity: "product_category",
      fields: ["id", "name"],
    }).catch(() => ({ data: [] as any[] }));
    categoryResult = (existingCategories || []) as any[];
  }

  let sizeOption: any;
  let colorOption: any;
  try {
    const { data: existingProducts } = await query.graph({
      entity: "product",
      fields: ["id", "handle"],
      pagination: { take: 1 },
    });
    if (existingProducts && existingProducts.length > 0) {
      logger.info("Products already exist, skipping product/options seed.");
      logger.info("Finished seeding product data.");
      return;
    }

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
    sizeOption = productOptionsResult.find((o) => o.title === "Size")!;
    colorOption = productOptionsResult.find((o) => o.title === "Color")!;
  } catch (e) {
    logger.warn(
      `Skipping product/options seed due to error: ${(e as Error)?.message ?? e}`
    );
    return;
  }

  try {
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
              prices: [{ amount: 100, currency_code: "ngn" }],
            },
            {
              title: "S / White",
              sku: "SHIRT-S-WHITE",
              options: { Size: "S", Color: "White" },
              prices: [{ amount: 100, currency_code: "ngn" }],
            },
            {
              title: "M / Black",
              sku: "SHIRT-M-BLACK",
              options: { Size: "M", Color: "Black" },
              prices: [{ amount: 100, currency_code: "ngn" }],
            },
            {
              title: "M / White",
              sku: "SHIRT-M-WHITE",
              options: { Size: "M", Color: "White" },
              prices: [{ amount: 100, currency_code: "ngn" }],
            },
            {
              title: "L / Black",
              sku: "SHIRT-L-BLACK",
              options: { Size: "L", Color: "Black" },
              prices: [{ amount: 100, currency_code: "ngn" }],
            },
            {
              title: "L / White",
              sku: "SHIRT-L-WHITE",
              options: { Size: "L", Color: "White" },
              prices: [{ amount: 100, currency_code: "ngn" }],
            },
            {
              title: "XL / Black",
              sku: "SHIRT-XL-BLACK",
              options: { Size: "XL", Color: "Black" },
              prices: [{ amount: 100, currency_code: "ngn" }],
            },
            {
              title: "XL / White",
              sku: "SHIRT-XL-WHITE",
              options: { Size: "XL", Color: "White" },
              prices: [{ amount: 100, currency_code: "ngn" }],
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
              prices: [{ amount: 100, currency_code: "ngn" }],
            },
            {
              title: "M",
              sku: "SWEATSHIRT-M",
              options: { Size: "M" },
              prices: [{ amount: 100, currency_code: "ngn" }],
            },
            {
              title: "L",
              sku: "SWEATSHIRT-L",
              options: { Size: "L" },
              prices: [{ amount: 100, currency_code: "ngn" }],
            },
            {
              title: "XL",
              sku: "SWEATSHIRT-XL",
              options: { Size: "XL" },
              prices: [{ amount: 100, currency_code: "ngn" }],
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
              prices: [{ amount: 100, currency_code: "ngn" }],
            },
            {
              title: "M",
              sku: "SWEATPANTS-M",
              options: { Size: "M" },
              prices: [{ amount: 100, currency_code: "ngn" }],
            },
            {
              title: "L",
              sku: "SWEATPANTS-L",
              options: { Size: "L" },
              prices: [{ amount: 100, currency_code: "ngn" }],
            },
            {
              title: "XL",
              sku: "SWEATPANTS-XL",
              options: { Size: "XL" },
              prices: [{ amount: 100, currency_code: "ngn" }],
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
              prices: [{ amount: 100, currency_code: "ngn" }],
            },
            {
              title: "M",
              sku: "SHORTS-M",
              options: { Size: "M" },
              prices: [{ amount: 100, currency_code: "ngn" }],
            },
            {
              title: "L",
              sku: "SHORTS-L",
              options: { Size: "L" },
              prices: [{ amount: 100, currency_code: "ngn" }],
            },
            {
              title: "XL",
              sku: "SHORTS-XL",
              options: { Size: "XL" },
              prices: [{ amount: 100, currency_code: "ngn" }],
            },
          ],
          sales_channels: [{ id: defaultSalesChannel.id }],
        },
      ],
    },
  });
  } catch (e) {
    logger.warn(
      `Skipping product creation due to error: ${(e as Error)?.message ?? e}`
    );
  }
  logger.info("Finished seeding product data.");

  logger.info("Seeding inventory levels.");
  try {
    const { data: inventoryItems } = await query.graph({
      entity: "inventory_item",
      fields: ["id"],
    });

    await createInventoryLevelsWorkflow(container).run({
      input: {
        inventory_levels: (inventoryItems || []).map((item: any) => ({
          location_id: stockLocation.id,
          stocked_quantity: 1000000,
          inventory_item_id: item.id,
        })),
      },
    });
  } catch (e) {
    logger.warn(
      `Skipping inventory level seed due to error: ${(e as Error)?.message ?? e}`
    );
  }

  logger.info("Finished seeding inventory levels data.");
}
