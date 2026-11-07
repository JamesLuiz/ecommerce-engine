import { beforeEach, describe, expect, it } from "vitest"
import { runProvisioning } from "../orchestrator"
import type { ProvisionStepDefinition } from "../types"
import type { ProvisionStepKey, ProvisionStepRecord, ProvisionStepStatus } from "../types"
import type { ProvisionStepStore } from "../store"
import type { Tenant } from "@flowcheq/db"

function createFakeStore(): ProvisionStepStore {
  const records = new Map<string, ProvisionStepRecord>()

  return {
    get: async (tenantId: string, step: ProvisionStepKey) => {
      const key = `${tenantId}:${step}`
      return records.get(key) ?? null
    },
    set: async (tenantId: string, step: ProvisionStepKey, status: ProvisionStepStatus, log?: string | null) => {
      records.set(`${tenantId}:${step}`, {
        tenantId,
        step,
        status,
        attempts: 0,
        log: log ?? null,
      })
    },
  }
}

function createFakeCoolify() {
  const client = {
    listApplications: async () => {
      return []
    },
    getApplication: async () => {
      throw new Error("not implemented in fake")
    },
    createApplication: async (input: { name: string }) => {
      return { uuid: `app-${input.name}` }
    },
    updateApplication: async () => {
      // noop
    },
    setEnvironmentVariable: async () => {
      // noop
    },
    deploy: async (input: { uuid: string }) => {
      return { deploymentUuid: `dep-${input.uuid}` }
    },
    getDeployment: async (uuid: string) => {
      return {
        uuid,
        status: "success",
        docker_registry_image_tag: null,
        logs: null,
        created_at: null,
        updated_at: null,
      }
    },
    rollback: async () => {
      throw new Error("not implemented in fake")
    },
    deleteApplication: async () => {
      // noop
    },
  }

  return { client }
}

function makeTenant(): Tenant {
  return {
    id: "tenant-1",
    customer_id: "customer-1",
    slug: "acme",
    config: {
      slug: "acme",
      businessName: "Acme",
      ownerEmail: "owner@acme.com",
      plan: "starter",
      currency: "USD",
      region: "ng",
      brand: { primaryColor: "#111111" },
      features: { multiVendor: false, paystack: true, stripe: false },
    },
    status: "provisioning",
    version: "v1.0.0",
    pinned_version: null,
    db_name: "t_acme",
    created_at: new Date("2026-01-01T00:00:00Z"),
  } as unknown as Tenant
}

describe("runProvisioning", () => {
  beforeEach(() => {
    delete process.env.BACKEND_IMAGE
    delete process.env.STOREFRONT_IMAGE
    delete process.env.STORE_BASE_DOMAIN
  })

  it("runs every pending step in order and reports success", async () => {
    const store = createFakeStore()
    const { client } = createFakeCoolify()
    const steps: ProvisionStepDefinition[] = [
      { key: "validate", run: async () => {} },
      { key: "finalize", run: async () => {} },
    ]

    const outcome = await runProvisioning({
      tenantId: "tenant-1",
      tenant: makeTenant(),
      steps,
      store,
      deps: { coolify: client },
    })

    expect(outcome.ok).toBe(true)
    expect(outcome.steps.map((step) => step.step)).toEqual(["validate", "finalize"])
    expect(outcome.steps.every((step) => step.status === "done")).toBe(true)
  })

  it("skips steps that already completed", async () => {
    const store = createFakeStore()
    const { client } = createFakeCoolify()
    const steps: ProvisionStepDefinition[] = [
      { key: "validate", run: async () => {} },
      { key: "finalize", run: async () => {} },
    ]

    await store.set("tenant-1", "validate", "done")

    const outcome = await runProvisioning({
      tenantId: "tenant-1",
      tenant: makeTenant(),
      steps,
      store,
      deps: { coolify: client },
    })

    expect(outcome.steps[0]?.status).toBe("done")
    expect(outcome.steps[1]?.status).toBe("done")
  })

  it("marks the failing step as failed and surfaces the error", async () => {
    const store = createFakeStore()
    const { client } = createFakeCoolify()
    const steps: ProvisionStepDefinition[] = [
      { key: "validate", run: async () => {} },
      { key: "finalize", run: async () => {
        throw new Error("boom")
      } },
    ]

    await expect(
      runProvisioning({
        tenantId: "tenant-1",
        tenant: makeTenant(),
        steps,
        store,
        deps: { coolify: client },
      })
    ).rejects.toThrow("boom")

    const failed = await store.get("tenant-1", "finalize")

    expect(failed?.status).toBe("failed")
    expect(failed?.log).toBe("boom")
  })
})
