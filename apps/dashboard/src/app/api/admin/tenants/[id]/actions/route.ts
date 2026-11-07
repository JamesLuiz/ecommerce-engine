import { and, eq, inArray } from "drizzle-orm"
import { NextResponse } from "next/server"
import { z } from "zod"

import { provision_steps, tenants } from "@flowcheq/db"
import { db } from "@lib/db"
import { recordAudit } from "@lib/audit"
import { enqueueDeprovision, enqueueProvision } from "@lib/queue"
import { getStaffSession } from "@lib/staff"

export const dynamic = "force-dynamic"

const ActionBody = z.discriminatedUnion("action", [
  z.object({ action: z.literal("retry") }),
  z.object({ action: z.literal("redeploy") }),
  z.object({ action: z.literal("suspend") }),
  z.object({ action: z.literal("resume") }),
  z.object({ action: z.literal("deprovision"), confirmation: z.string().min(1) }),
])

const REDEPLOY_STEPS = [
  "backend_app",
  "storefront_app",
  "deploy_backend",
  "read_bootstrap",
  "deploy_storefront",
  "finalize",
] as const

const DEPROVISIONABLE_STATUSES = new Set(["active", "suspended", "failed"])

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const staff = await getStaffSession()

  if (!staff) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json().catch(() => null)
  const parsed = ActionBody.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  }

  const rows = await db.select().from(tenants).where(eq(tenants.id, id))
  const tenant = rows[0]

  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 })
  }

  try {
    switch (parsed.data.action) {
      case "retry": {
        await db
          .update(provision_steps)
          .set({ status: "pending", log: null, updated_at: new Date() })
          .where(
            and(
              eq(provision_steps.tenant_id, id),
              inArray(provision_steps.status, ["failed", "running"])
            )
          )

        const jobId = await enqueueProvision(id)

        await db.update(tenants).set({ status: "provisioning" }).where(eq(tenants.id, id))
        await recordAudit({
          actor: staff.email,
          action: "tenant.retry",
          tenantId: id,
          meta: { jobId },
        })

        return NextResponse.json({ ok: true, jobId, status: "provisioning" })
      }

      case "redeploy": {
        await db
          .update(provision_steps)
          .set({ status: "pending", log: null, updated_at: new Date() })
          .where(
            and(
              eq(provision_steps.tenant_id, id),
              inArray(provision_steps.step, [...REDEPLOY_STEPS])
            )
          )

        const jobId = await enqueueProvision(id)

        await db.update(tenants).set({ status: "provisioning" }).where(eq(tenants.id, id))
        await recordAudit({
          actor: staff.email,
          action: "tenant.redeploy",
          tenantId: id,
          meta: { jobId },
        })

        return NextResponse.json({ ok: true, jobId, status: "provisioning" })
      }

      case "suspend": {
        await db.update(tenants).set({ status: "suspended" }).where(eq(tenants.id, id))
        await recordAudit({
          actor: staff.email,
          action: "tenant.suspend",
          tenantId: id,
          meta: null,
        })

        return NextResponse.json({ ok: true, status: "suspended" })
      }

      case "resume": {
        await db.update(tenants).set({ status: "active" }).where(eq(tenants.id, id))
        await recordAudit({
          actor: staff.email,
          action: "tenant.resume",
          tenantId: id,
          meta: null,
        })

        return NextResponse.json({ ok: true, status: "active" })
      }

      case "deprovision": {
        if (parsed.data.confirmation !== tenant.slug) {
          return NextResponse.json(
            { error: `Type "${tenant.slug}" to confirm deprovisioning` },
            { status: 400 }
          )
        }

        if (!DEPROVISIONABLE_STATUSES.has(tenant.status)) {
          return NextResponse.json(
            { error: `Cannot deprovision a tenant with status "${tenant.status}"` },
            { status: 409 }
          )
        }

        const jobId = await enqueueDeprovision(id)

        await db.update(tenants).set({ status: "deprovisioning" }).where(eq(tenants.id, id))
        await recordAudit({
          actor: staff.email,
          action: "tenant.deprovision.requested",
          tenantId: id,
          meta: { jobId },
        })

        return NextResponse.json({ ok: true, jobId, status: "deprovisioning" })
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: `Action failed: ${message}` }, { status: 503 })
  }
}
