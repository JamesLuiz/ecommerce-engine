# Store setup guide: products, prices, categories, shipping, tax and regions

Use this guide when a new store is ready for real products. Everything happens in
the tenant Medusa Admin (`https://<your-store>-admin.example.store/app`). No code
changes or redeploys are needed.

## Recommended order

1. Regions and payment providers
2. Stock locations, sales channels and shipping
3. Tax
4. Products and prices
5. Categories and collections
6. Test checkout

The order matters: prices, shipping options, tax rates and payment methods are
all attached to a region or a country. Create the region first so the other
screens have somewhere to attach their settings.

New Flowcheq stores are prepared for Nigeria automatically: the region uses NGN,
the tax region and Nigeria Warehouse are linked to the storefront sales channel,
both manual payment and Paystack are selected on the region, and Standard and
Express shipping start at `0.00` (free). Stock is added automatically for
existing and newly listed products. Use the steps below to change those
defaults, add other regions, or repair a store created before this automation.
Existing settings are not overwritten when setup is rerun.

## 1. Set up regions

A region is a group of countries that share a currency and checkout settings.
The storefront URL uses the country code, for example `/ng/checkout` for Nigeria
or `/gb/checkout` for the United Kingdom.

1. Go to **Settings → Regions**.
2. Click **Create**.
3. Fill in:
   - **Name**: for example `Nigeria`.
   - **Currency**: the currency customers in this region pay in, for example
     `ngn`. A region has exactly one currency.
   - **Countries**: click **Add countries**, select the countries, then
     **Save**. Add at least the country you will test with.
   - **Payment providers**: select every provider customers may use, for example
     Paystack. A provider that is installed but not selected here will not show
     at checkout.
   - **Automatic taxes**: leave enabled unless your technical team told you to
     disable it.
   - **Tax inclusive pricing**: enable only if your displayed prices already
     include tax.
4. Click **Save**.

To change a region later, open the region from **Settings → Regions**, use the
three-dot menu in the first section, and choose **Edit**.

## 2. Set up stock locations, sales channels and shipping

Shipping is the most common reason checkout stops at the delivery step. Medusa
only offers shipping options that pass **all** of these checks:

- The option belongs to a stock location linked to the cart's sales channel.
- The option's service zone includes the cart's shipping country.
- The cart's products belong to the option's shipping profile.
- The option is enabled in store and has a usable price.
- The stock location has the fulfillment provider used by the option.

Work through the setup in that order.

### 2.1 Check the sales channel

1. Go to **Settings → Sales Channels**.
2. Open the sales channel used by the storefront (usually named after the
   business or `storefront`).
3. Note its name. You will link stock locations to it in the next step.

If the storefront sales channel is wrong, products and shipping options may
exist in the admin but never appear in the store.

### 2.2 Create or open a stock location

1. Go to **Settings → Locations & Shipping**.
2. Create a location, or click an existing one to open its details.
3. Use a clear name such as `Nigeria Warehouse` or `Main Warehouse`.
4. In **Sales Channels**, choose **Edit** from the section's three-dot menu and
   select the storefront sales channel. Save.
5. In **Fulfillment Providers**, choose **Edit** and enable the provider that
   will handle orders. For a store that fulfills orders itself, enable
   `manual` (its provider id is `manual_manual`). Save.

> One location can serve several regions, but every region you want to ship to
> must be linked to a location that has a service zone covering that country.

### 2.3 Enable shipping and create a service zone

1. On the location details page, find the **Shipping** section.
2. Open its three-dot menu and choose **Enable** if shipping is disabled.
3. Open the same menu again and choose **Create service zone**.
4. Enter a name, for example `Nigeria Delivery`.
5. Click **Manage areas**, select the same countries that are in your region,
   then **Save**.
6. Save the service zone.

A service zone for pickup uses the same steps in the **Pickup** section. Pickup
options need a location address and are only shown when pickup is enabled.

### 2.4 Create shipping options

Flowcheq creates `Standard Shipping` and `Express Shipping` at `0.00` on a new
store. Open an option to change its price whenever you want; later setup runs
preserve the price you set.

1. On the location details page, find your service zone under **Shipping**.
2. Click **Create option** next to **Shipping options**.
3. Fill in the first step:
   - **Price type**: choose **Fixed** for a normal flat rate. Choose
     **Calculated** only when the fulfillment provider can calculate rates.
   - **Name**: what the customer sees, for example `Standard Shipping`.
   - **Shipping profile**: choose the profile used by your products. The
     default profile is `Default Shipping Profile`.
   - **Shipping option type**: for example `Standard` or `Express`.
   - **Fulfillment provider**: choose the provider enabled in step 2.2.
   - **Fulfillment option**: choose the option offered by that provider. The
     built-in manual provider supports fixed-price shipping.
   - **Enable in store**: keep enabled.
4. If you chose **Fixed**, click **Continue** and enter a price for the region
   or currency in the price grid. A fixed option with no price cannot be used.
5. Click **Save**.
6. Repeat for each delivery speed you want to offer.

### 2.5 Quick shipping checklist

Before testing checkout, confirm all of these:

- [ ] Products are published and assigned to the storefront sales channel.
- [ ] Products use a shipping profile that has shipping options.
- [ ] The storefront sales channel is linked to the stock location.
- [ ] The stock location has the required fulfillment provider enabled.
- [ ] The shipping mode is enabled and has a service zone.
- [ ] The service zone contains the customer's country.
- [ ] Each option is enabled in store and has a price for the region/currency.
- [ ] Inventory exists at that stock location (or inventory management is off).

## 3. Set up payments

Manual payment and Paystack are selected on new regions during deployment, so no
action is needed for the default setup. To change the methods customers can use:

1. Go back to **Settings → Regions** and open your region.
2. Use the three-dot menu and choose **Edit**.
3. In **Payment providers**, select every provider customers may use.
4. Save.

For Paystack, first-time setup registers the store with the Flowcheq payments
gateway and saves the returned vendor token encrypted in the tenant database.
No manual token copy is needed. Keep `GATEWAY_URL` and
`PAYMENTS_GATEWAY_ADMIN_TOKEN` on the backend so setup can register or refresh
that vendor; `GATEWAY_TOKEN` and `GATEWAY_WEBHOOK_SECRET` are only optional
fallbacks for imported stores. Tenants never store the Paystack master secret.
If Paystack is installed but missing from the region, it will not appear in the
storefront even though it exists in the admin. Select it there to repair an
older store.

## 4. Set up tax

1. Go to **Settings → Tax Regions**.
2. Click **Create**.
3. Choose the country. Optionally enter a default tax rate name, percentage and
   tax code. Save.
4. Open the tax region to manage it:
   - Edit the default rate with the three-dot menu on the rate row.
   - Add an **Override** for a specific product, product type or shipping option
     when a different rate applies.
   - For countries that need state/province rates, add a **Sublevel** region.
5. Return to **Settings → Regions** and confirm **Automatic taxes** is enabled
   for the matching region.
6. Decide whether the region uses tax-inclusive prices. If it does, enter prices
   with tax already included; otherwise tax is added at checkout.

## 5. Add products and prices

1. Go to **Products** and click **Create**.
2. **Details step**: enter the title, handle, description and images. Enable
   variants if the product has options such as size or colour.
3. **Organize step**:
   - Add the product to the storefront sales channel.
   - Choose the shipping profile that has your shipping options.
   - Optionally choose a collection, categories and tags.
   - Keep **Discountable** enabled if promotions should apply.
4. **Variants step**:
   - Use the price columns for each currency or region. These are the product's
     default prices ("price tags").
   - If you manage inventory, enable **Managed inventory** and set the quantity
     at the stock location that serves the region.
   - Set **Allow backorder** only if you want to sell when stock is zero.
5. Click **Publish**. Draft products do not appear in the storefront.

### Sales and special pricing

Use **Price Lists** when a price is temporary or customer-specific:

1. Go to **Price Lists** and click **Create**.
2. Choose **Sale** for a temporary discount or **Override** for a permanent
   customer-group price.
3. Enter a title, status and optional start/expiry dates.
4. Choose the products, then enter prices per region or currency.
5. Save. The list only applies to customers you selected in **Customer
   availability**.

## 6. Add categories and collections

Categories and collections are different: a category is a browsable grouping in
the catalogue, while a collection is a curated set that can be featured on the
homepage.

1. Go to **Product → Categories** and click **Create**.
2. Enter a title and handle, keep status **Active** and visibility **Public**,
   then save. Drag to nest categories if needed.
3. Open the category, use the three-dot menu in the **Products** section, choose
   **Add**, select products and save.
4. Go to **Product → Collections**, create a collection, and add products.
5. To feature a collection on the homepage, go to **Settings → Storefront →
   Home** and select it under featured collections.

## 7. Test checkout

1. Open the storefront, for example `http://localhost:8000/ng`.
2. Add a published product to the cart.
3. At checkout, enter an address in the region you configured.
4. On the delivery step, confirm at least one shipping option appears and
   select it.
5. On the payment step, confirm the expected payment provider appears.
6. Place a test order and confirm it appears under **Orders** in the admin.

## Troubleshooting

| Symptom | Most likely cause | Fix |
| --- | --- | --- |
| No shipping options at checkout | Storefront sales channel is not linked to the stock location that owns the options | Steps 2.1 and 2.2 |
| No shipping options for one country only | Service zone does not include that country | Step 2.3 |
| Options appear in admin but not storefront | Option is disabled in store, has no price, or products use a different shipping profile | Step 2.4 |
| "Continue to payment" stays disabled | No shipping method was selected | Select a delivery or pickup option |
| Payment provider missing | Provider not selected on the region, or backend provider misconfigured | Step 3 |
| Product missing from storefront | Draft, not in the storefront sales channel, or no price for the region | Step 5 |
| Price shows `-` | Fixed price missing, or calculated provider failed | Step 2.4 and provider logs |

## Official references

- [Regions in Medusa Admin](https://docs.medusajs.com/user-guide/settings/regions)
- [Locations and shipping in Medusa Admin](https://docs.medusajs.com/user-guide/settings/locations-and-shipping/locations)
- [Shipping options](https://docs.medusajs.com/resources/commerce-modules/fulfillment/shipping-option)
- [Tax regions](https://docs.medusajs.com/user-guide/settings/tax-regions)
- [Create product](https://docs.medusajs.com/user-guide/products/create)
- [Price lists](https://docs.medusajs.com/user-guide/price-lists/create)
- [Product categories](https://docs.medusajs.com/user-guide/products/categories)
