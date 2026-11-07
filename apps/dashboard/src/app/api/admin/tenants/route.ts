import { desc, eq } from "drizzle-orm"
import { NextResponse } from "next/server"

import { customers, tenants } from "@flowcheq/db"
import { db } from "@lib/db"
import { getStaffSession } from "@lib/staff"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const staff = await getStaffSession()

  if (!staff) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const status = new URL(request.url).searchParams.get("status")

  const base = db
    .select({
      id: tenants.id,
      slug: tenants.slug,
      status: tenants.status,
      version: tenants.version,
      pinned_version: tenants.pinned_version,
      config: tenants.config,
      store_url: tenants.store_url,
      admin_url: tenants.admin_url,
      created_at: tenants.created_at,
      customer_email: customers.email,
    })
    .from(tenants)
    .innerJoin(customers, eq(tenants.customer_id, customers.id))

  const rows = status
    ? await base.where(eq(tenants.status, status)).orderBy(desc(tenants.created_at)).limit(500)
    : await base.orderBy(desc(tenants.created_at)).limit(500)

  return NextResponse.json({ tenants: rows })
}
