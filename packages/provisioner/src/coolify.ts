export interface CoolifyApplication {
  uuid: string
  name: string | null
  status: string | null
  fqdn: string | null
  docker_registry_image_name: string | null
  docker_registry_image_tag: string | null
  environment_id: number | null
}

export interface CreateCoolifyApplicationInput {
  projectUuid: string
  serverUuid: string
  environmentName: string
  name: string
  dockerRegistryImageName: string
  dockerRegistryImageTag: string
  portsExposes?: string
  domains?: string
  healthCheckPath?: string
  instantDeploy?: boolean
}

export interface UpdateCoolifyApplicationInput {
  dockerRegistryImageTag?: string
  dockerRegistryImageName?: string
  portsExposes?: string
  domains?: string
  healthCheckPath?: string
  instantDeploy?: boolean
}

export interface CoolifyDeployment {
  uuid: string
  status: string
  docker_registry_image_tag: string | null
  logs: string | null
  created_at: string | null
  updated_at: string | null
}

export interface CoolifyDeployResult {
  deploymentUuid: string
}

export interface CoolifyRollbackResult {
  deploymentUuid: string
}

export interface CoolifyClient {
  listApplications(): Promise<CoolifyApplication[]>
  getApplication(uuid: string): Promise<CoolifyApplication>
  createApplication(input: CreateCoolifyApplicationInput): Promise<{ uuid: string }>
  updateApplication(uuid: string, input: UpdateCoolifyApplicationInput): Promise<void>
  setEnvironmentVariable(appUuid: string, key: string, value: string): Promise<void>
  deploy(input: { uuid: string; tag?: string; force?: boolean }): Promise<CoolifyDeployResult>
  getDeployment(uuid: string): Promise<CoolifyDeployment>
  rollback(input: { uuid: string; commit: string }): Promise<CoolifyRollbackResult>
  deleteApplication(uuid: string): Promise<void>
}

export interface CoolifyClientOptions {
  baseUrl: string
  token: string
  fetchImpl?: typeof fetch
  retries?: number
  retryBaseDelayMs?: number
}

export class CoolifyError extends Error {
  readonly status: number
  readonly body: string

  constructor(status: number, body: string, message?: string) {
    super(message ?? `Coolify request failed with status ${status}`)
    this.name = "CoolifyError"
    this.status = status
    this.body = body
  }
}

interface CoolifyRequestInput {
  method: string
  path: string
  query?: Record<string, string | boolean | undefined>
  body?: unknown
}

interface CoolifyDeployResponse {
  deployments?: Array<{
    message?: string
    resource_uuid?: string
    deployment_uuid?: string
  }>
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

async function coolifyFetch<T>(options: CoolifyClientOptions, input: CoolifyRequestInput): Promise<T> {
  const { baseUrl, token, fetchImpl = fetch, retries = 3, retryBaseDelayMs = 500 } = options
  const url = new URL(`${baseUrl.replace(/\/+$/, "")}${input.path}`)
  const query = input.query ?? {}
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value))
    }
  }

  let lastError: unknown = undefined

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const response = await fetchImpl(url.toString(), {
        method: input.method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: input.body === undefined ? undefined : JSON.stringify(input.body),
      })

      if (response.ok) {
        const text = await response.text()
        return JSON.parse(text) as T
      }

      const body = await response.text()
      const error = new CoolifyError(response.status, body)

      if (response.status >= 500 && attempt < retries) {
        lastError = error
        await sleep(retryBaseDelayMs * 2 ** (attempt - 1))
        continue
      }

      throw error
    } catch (error) {
      lastError = error
      const retryable = !(error instanceof CoolifyError && error.status < 500)
      if (retryable && attempt < retries) {
        await sleep(retryBaseDelayMs * 2 ** (attempt - 1))
        continue
      }
      throw error
    }
  }

  throw lastError
}

export function createCoolifyClient(options: CoolifyClientOptions): CoolifyClient {
  const doFetch = async <T>(
    path: string,
    method: string,
    query: CoolifyRequestInput["query"] = undefined,
    body?: unknown
  ): Promise<T> => {
    const result = await coolifyFetch<T>(options, { method, path, query, body })
    return result
  }

  return {
    listApplications: async () => {
      const result = await doFetch<CoolifyApplication[]>("/applications", "GET")
      return result
    },
    getApplication: async (uuid: string) => {
      const result = await doFetch<CoolifyApplication>(`/applications/${uuid}`, "GET")
      return result
    },
    createApplication: async (input: CreateCoolifyApplicationInput) => {
      const body: Record<string, unknown> = {
        project_uuid: input.projectUuid,
        server_uuid: input.serverUuid,
        environment_name: input.environmentName,
        name: input.name,
        docker_registry_image_name: input.dockerRegistryImageName,
        docker_registry_image_tag: input.dockerRegistryImageTag,
        ports_exposes: input.portsExposes,
        domains: input.domains,
      }
      if (input.healthCheckPath) {
        body.health_check_path = input.healthCheckPath
      }
      if (input.instantDeploy !== undefined) {
        body.instant_deploy = input.instantDeploy
      }
      const result = await doFetch<{ uuid: string }>("/applications/dockerimage", "POST", undefined, body)
      return result
    },
    updateApplication: async (uuid: string, input: UpdateCoolifyApplicationInput) => {
      const body: Record<string, unknown> = {}
      if (input.dockerRegistryImageTag !== undefined) {
        body.docker_registry_image_tag = input.dockerRegistryImageTag
      }
      if (input.dockerRegistryImageName !== undefined) {
        body.docker_registry_image_name = input.dockerRegistryImageName
      }
      if (input.portsExposes !== undefined) {
        body.ports_exposes = input.portsExposes
      }
      if (input.domains !== undefined) {
        body.domains = input.domains
      }
      if (input.healthCheckPath !== undefined) {
        body.health_check_path = input.healthCheckPath
      }
      if (input.instantDeploy !== undefined) {
        body.instant_deploy = input.instantDeploy
      }
      if (Object.keys(body).length === 0) {
        return
      }
      await doFetch<unknown>(`/applications/${uuid}`, "PATCH", undefined, body)
      return
    },
    setEnvironmentVariable: async (appUuid: string, key: string, value: string) => {
      await doFetch<unknown>(`/applications/${appUuid}/envs`, "POST", undefined, { key, value })
      return
    },
    deploy: async (input: { uuid: string; tag?: string; force?: boolean }) => {
      const query: Record<string, string | boolean | undefined> = { uuid: input.uuid }
      if (input.tag) {
        query.tag = input.tag
      }
      if (input.force) {
        query.force = true
      }
      const result = await doFetch<CoolifyDeployResponse>("/deploy", "POST", query)
      const deployment = result.deployments?.[0]
      if (!deployment?.deployment_uuid) {
        throw new Error("Coolify deploy did not return a deployment uuid")
      }
      return { deploymentUuid: deployment.deployment_uuid }
    },
    getDeployment: async (uuid: string) => {
      const result = await doFetch<CoolifyDeployment>(`/deployments/${uuid}`, "GET")
      return result
    },
    rollback: async (input: { uuid: string; commit: string }) => {
      const result = await doFetch<{ deployment_uuid: string }>(`/applications/${input.uuid}/rollback`, "POST", undefined, {
        commit: input.commit,
      })
      return { deploymentUuid: result.deployment_uuid }
    },
    deleteApplication: async (uuid: string) => {
      await doFetch<unknown>(`/applications/${uuid}`, "DELETE")
      return
    },
  }
}

export interface WaitForDeploymentOptions {
  pollIntervalMs?: number
  timeoutMs?: number
}

export function isTerminalDeploymentStatus(status: string): boolean {
  return status === "success" || status === "failed" || status === "canceled"
}

export async function waitForDeployment(
  coolify: CoolifyClient,
  deploymentUuid: string,
  options: WaitForDeploymentOptions = {}
): Promise<CoolifyDeployment> {
  const pollIntervalMs = options.pollIntervalMs ?? 5000
  const timeoutMs = options.timeoutMs ?? 120000
  const startedAt = Date.now()
  let current = await coolify.getDeployment(deploymentUuid)

  while (!isTerminalDeploymentStatus(current.status)) {
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error(`Timed out waiting for Coolify deployment ${deploymentUuid} with status ${current.status}`)
    }
    await sleep(pollIntervalMs)
    current = await coolify.getDeployment(deploymentUuid)
  }

  return current
}
