import type { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"

export default async function findPublishableKey({
  container,
}: ExecArgs): Promise<void> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const storeModule = container.resolve(Modules.STORE)

  const { data: keys } = await query.graph({
    entity: "api_key",
    fields: ["id", "title", "type", "token", "is_active"],
    filters: { type: "publishable" },
  })

  for (const key of keys) {
    console.log(
      `api_key: id=${key.id} title=${key.title} type=${key.type} token=${key.token}`
    )
  }

  const [store] = await storeModule.listStores({}, { select: ["id", "name"] })
  console.log(`store: id=${store?.id} name=${store?.name}`)
}
