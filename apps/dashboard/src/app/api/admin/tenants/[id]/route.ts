import { desc, eq } from "drizzle-orm"
import { NextResponse } from "next/server"

import { audit_log, customers, provision_steps, tenants } from "@flowcheq/db"
import { db } from "@lib/db"
import { getStaffSession } from "@lib/staff"

export const dynamic = "force-dynamic"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const staff = await getStaffSession()

  if (!staff) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  const rows = await db
    .select({
      tenant: tenants,
      customer_email: customers.email,
      customer_name: customers.name,
    })
    .from(tenants)
    .innerJoin(customers, eq(tenants.customer_id, customers.id))
    .where(eq(tenants.id, id))

  const row = rows[0]

  if (!row) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 })
  }

  const steps = await db
    .select()
    .from(provision_steps)
    .where(eq(provision_steps.tenant_id, id))
    .orderBy(provision_steps.updated_at)

  const audit = await db
    .select()
    .from(audit_log)
    .where(eq(audit_log.tenant_id, id))
    .orderBy(desc(audit_log.at))
    .limit(50)

  return NextResponse.json({
    tenant: row.tenant,
    customer: { email: row.customer_email, name: row.customer_name },
    steps,
    audit,
  })
}
