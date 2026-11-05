import { argon2id } from 'hash-wasm'
import { newWebSocketRpcSession } from 'capnweb'
import { forbidden, HttpError, notFound } from '@southneuhof/sprindle'
import { z } from 'zod/v4'
import {
  collectionRecordSchema,
  contextItemUpdateInputSchema,
  contextItemCreateInputSchema,
  contextDocumentSchema,
  contextDocumentSummarySchema,
  contextModelSchema,
  connectorRecordSchema,
  modelListSchema,
} from '../routes/(authenticated)/cloudflare-os/schema'

const serviceSalt = Uint8Array.from([0xd9, 0x4e, 0x54, 0x1d, 0x29, 0xc1, 0x03, 0x74, 0x73, 0x7e, 0xb3, 0xe3, 0x34, 0x6d, 0x8f, 0x21])
const rpcTimeoutMs = 30_000

type AdminSettings = {
  getSettings(): Promise<unknown>
  setInstanceInstructions(text: string): Promise<void>
}

type ContextApi = {
  getViewerInfo(): Promise<unknown>
  createContextCollection(title: string, description: string, visibility: 'private' | 'public', icon?: string, source?: 'web' | 'git'): Promise<unknown>
  updateContextCollection(collectionId: string, options: { title?: string; description?: string; icon?: string }): Promise<void>
  deleteContextCollection(collectionId: string): Promise<void>
  getContextCollectionMetadata(collectionId: string): Promise<unknown>
  listContextDocuments(collectionId: string): Promise<unknown>
  getContextDocument(collectionId: string, path: string): Promise<unknown>
  putContextDocument(collectionId: string, path: string, doc: { description: string; body: string; contentType?: string }): Promise<void>
  createContextSkill(collectionId: string, path: string, doc: { description: string; body: string; contentType?: string }): Promise<void>
  deleteContextDocument(collectionId: string, path: string): Promise<void>
  deleteContextSkill(collectionId: string, manifestPath: string): Promise<void>
  listEnabledContextCollections(): Promise<unknown>
  getContextCollectionPermissions(collectionId: string): Promise<unknown>
}

type AuthenticatedApi = {
  whoami(): Promise<unknown>
  getAdminApi(): Promise<AdminSettings | null>
  listModels(kind?: 'language'): Promise<unknown>
  getModelConfig(id: string): Promise<unknown>
  getAiConfig(): Promise<unknown>
  getGatekeeperApp(id: 'context'): Promise<{ ui: ContextApi } | null>
}

type PublicApi = {
  ping(): Promise<void>
  getServerConfig(): Promise<unknown>
  login(username: string, passwordHash: Uint8Array): Promise<unknown>
  authenticate(token: string): Promise<AuthenticatedApi>
}

const serverConfigSchema = z.object({ passwordAuthEnabled: z.boolean() })
const tokenSchema = z.string().min(1).nullable()
const identitySchema = z.object({ type: z.string() })
const profileSchema = z.object({ type: z.string(), id: z.string().min(1), name: z.string() })
const providerSchema = z.enum(['openai', 'anthropic', 'google', 'cloudflare', 'ollama'])
const gatewayModelsSchema = z.object({
  providers: z.array(providerSchema),
  providerSettings: z.array(z.object({
    provider: providerSchema,
    enabledBy: z.enum(['environment', 'admin']).optional(),
    needsApiToken: z.boolean(),
  })),
  models: z.array(z.object({
    provider: providerSchema,
    id: z.string(),
    name: z.string(),
    contextWindow: z.number().int().positive(),
    outputLimit: z.number().int().positive().optional(),
    mode: z.enum(['enabled', 'hidden', 'disabled']),
    added: z.boolean(),
    runtimeKnown: z.boolean(),
  })),
})
const modelConfigSchema = z.object({
  provider: providerSchema,
  model: z.string(),
  apiUrl: z.string().optional(),
  contextWindow: z.number().int().positive().optional(),
  outputLimit: z.number().int().positive().optional(),
})
const settingsSchema = z.object({
  instanceInstructions: z.string(),
  resourceVendors: z.array(z.unknown()),
  gatewayModels: gatewayModelsSchema.optional(),
})
const aiConfigSchema = z.discriminatedUnion('enabled', [
  z.object({ enabled: z.literal(true), builtInModelIds: z.array(z.string()) }),
  z.object({ enabled: z.literal(false) }),
])
const vendorSchema = z.discriminatedUnion('autoProvisions', [
  z.object({
    vendorId: z.string(),
    displayName: z.string(),
    autoProvisions: z.literal(false),
    enabled: z.boolean(),
    resources: z.array(z.object({ urlPattern: z.string(), title: z.string(), description: z.string(), enabled: z.boolean() })),
  }),
  z.object({
    vendorId: z.string(),
    displayName: z.string(),
    autoProvisions: z.literal(true),
    ambientMode: z.enum(['disabled', 'optional', 'enabled']),
  }),
])
const collectionMetadataSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  description: z.string(),
  icon: z.string().optional(),
  visibility: z.enum(['private', 'public']),
  created: z.union([z.date(), z.string()]),
  lastUpdated: z.union([z.date(), z.string()]),
  documentCount: z.number().int().nonnegative(),
  content: z.discriminatedUnion('source', [z.object({ source: z.literal('web') }), z.object({ source: z.literal('git') })]),
})
const collectionPermissionsSchema = z.object({ canEdit: z.boolean(), canDelete: z.boolean() })
const viewerInfoSchema = z.object({ isAdmin: z.boolean(), supportsGitCollections: z.boolean() })
const enabledCollectionsSchema = z.array(z.object({ id: z.string().min(1) }))
const documentSummarySchema = z.array(z.object({
  path: z.string(),
  name: z.string(),
  description: z.string(),
  contentType: z.string(),
  skillName: z.string().optional(),
  skillError: z.string().optional(),
  lastUpdated: z.union([z.date(), z.string()]),
}))
const documentSchema = z.object({
  path: z.string(),
  name: z.string(),
  description: z.string(),
  contentType: z.string(),
  body: z.string(),
  skillName: z.string().optional(),
  lastUpdated: z.union([z.date(), z.string()]),
})
function withTimeout<T>(operation: Promise<T>, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(`Cloudflare OS ${label} timed out.`)), rpcTimeoutMs)
  })
  return Promise.race([operation, timeout]).finally(() => {
    if (timer) clearTimeout(timer)
  })
}

function socketEndpoint(value: string): string {
  const endpoint = new URL(value)
  const localHosts = new Set(['localhost', '127.0.0.1', '[::1]', '::1'])
  if (!localHosts.has(endpoint.hostname.toLowerCase()) || !['http:', 'https:'].includes(endpoint.protocol)) {
    throw new Error('Cloudflare OS must use the configured local HTTP endpoint.')
  }
  endpoint.protocol = endpoint.protocol === 'https:' ? 'wss:' : 'ws:'
  endpoint.pathname = '/api'
  endpoint.search = ''
  endpoint.hash = ''
  return endpoint.toString()
}

async function passwordHash(username: string, password: string): Promise<Uint8Array> {
  const usernameBytes = new TextEncoder().encode(username)
  const salt = new Uint8Array(serviceSalt.length + usernameBytes.length)
  salt.set(serviceSalt)
  salt.set(usernameBytes, serviceSalt.length)
  try {
    return await argon2id({ password, salt, parallelism: 1, iterations: 3, memorySize: 65536, hashLength: 32, outputType: 'binary' })
  } finally {
    salt.fill(0)
    usernameBytes.fill(0)
  }
}

async function withAuthenticated<T>(operation: (api: AuthenticatedApi) => Promise<T>): Promise<T> {
  const endpoint = process.env.CLOUDFLARE_OS_ENDPOINT || 'http://localhost:8787'
  const username = process.env.CLOUDFLARE_OS_USERNAME
  const password = process.env.CLOUDFLARE_OS_PASSWORD
  if (!username || !password) throw new HttpError(503, 'cloudflare_os_credentials_missing')

  const publicApi = newWebSocketRpcSession<PublicApi>(socketEndpoint(endpoint))
  try {
    await withTimeout(publicApi.ping(), 'connection check')
    const config = serverConfigSchema.parse(await withTimeout(publicApi.getServerConfig(), 'configuration request'))
    if (!config.passwordAuthEnabled) throw new HttpError(503, 'cloudflare_os_password_login_disabled')

    const hash = await passwordHash(username, password)
    let token: string | null
    try {
      token = tokenSchema.parse(await withTimeout(publicApi.login(username, hash), 'login'))
    } finally {
      hash.fill(0)
    }
    if (!token) throw new HttpError(503, 'cloudflare_os_login_failed')

    const authenticatedApi = await withTimeout(publicApi.authenticate(token), 'authentication')
    token = null
    const identity = identitySchema.parse(await withTimeout(authenticatedApi.whoami(), 'identity request'))
    if (identity.type !== 'user') throw new HttpError(503, 'cloudflare_os_user_session_required')
    return await operation(authenticatedApi)
  } finally {
    publicApi[Symbol.dispose]()
  }
}

function safeEndpoint(value: string | undefined): string | null {
  if (!value) return null
  try {
    const endpoint = new URL(value)
    if (!['http:', 'https:'].includes(endpoint.protocol)) return null
    endpoint.username = ''
    endpoint.password = ''
    endpoint.search = ''
    endpoint.hash = ''
    return endpoint.toString()
  } catch {
    return null
  }
}

function safeResourcePattern(value: string): string {
  try {
    const endpoint = new URL(value)
    if (!['http:', 'https:'].includes(endpoint.protocol)) return value.split(/[?#]/, 1)[0] ?? value
    endpoint.username = ''
    endpoint.password = ''
    endpoint.search = ''
    endpoint.hash = ''
    return endpoint.toString()
  } catch {
    return value.split(/[?#]/, 1)[0] ?? value
  }
}

export function mapAccountModel(profileValue: unknown, configValue: unknown) {
  const profile = profileSchema.parse(profileValue)
  const config = modelConfigSchema.parse(configValue)
  return contextModelSchema.parse({
    key: `account:${profile.id}`,
    id: profile.id,
    name: profile.name,
    source: 'account',
    provider: config.provider,
    model: config.model,
    endpoint: safeEndpoint(config.apiUrl),
    contextWindow: config.contextWindow ?? null,
    outputLimit: config.outputLimit ?? null,
    mode: null,
    added: null,
    runtimeKnown: null,
  })
}

function mapGatewayModel(value: z.output<typeof gatewayModelsSchema>['models'][number]) {
  return contextModelSchema.parse({
    key: `gateway:${value.id}`,
    id: value.id,
    name: value.name,
    source: 'gateway',
    provider: value.provider,
    model: value.id,
    endpoint: null,
    contextWindow: value.contextWindow,
    outputLimit: value.outputLimit ?? null,
    mode: value.mode,
    added: value.added,
    runtimeKnown: value.runtimeKnown,
  })
}

async function adminApi(api: AuthenticatedApi): Promise<AdminSettings | null> {
  return withTimeout(api.getAdminApi(), 'admin capability request')
}

async function contextApi(api: AuthenticatedApi): Promise<ContextApi | null> {
  const frame = await withTimeout(api.getGatekeeperApp('context'), 'Context capability request')
  return frame?.ui ?? null
}

function remoteAdminRequired(): never {
  throw forbidden('Cloudflare OS administrator access is required for this setting.')
}

function contextUnavailable(): never {
  throw new HttpError(503, 'cloudflare_os_context_unavailable')
}

function dateText(value: Date | string): string {
  const parsed = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(parsed.getTime())) throw new HttpError(502, 'cloudflare_os_invalid_response')
  return parsed.toISOString()
}

async function collectionRecord(api: ContextApi, id: string) {
  const rawMetadata = await withTimeout(api.getContextCollectionMetadata(id), 'Context collection request')
  if (rawMetadata === null) throw notFound()
  const metadata = collectionMetadataSchema.parse(rawMetadata)
  const permissions = collectionPermissionsSchema.parse(await withTimeout(api.getContextCollectionPermissions(id), 'Context permission request'))
  return collectionRecordSchema.parse({
    id: metadata.id,
    title: metadata.title,
    description: metadata.description,
    ...(metadata.icon === undefined ? {} : { icon: metadata.icon }),
    visibility: metadata.visibility,
    source: metadata.content.source,
    documentCount: metadata.documentCount,
    createdAt: dateText(metadata.created),
    updatedAt: dateText(metadata.lastUpdated),
    canEdit: permissions.canEdit && metadata.content.source === 'web',
    canDelete: permissions.canDelete && metadata.content.source === 'web',
  })
}

function requireWebEditable(record: z.output<typeof collectionRecordSchema>) {
  if (record.source !== 'web' || !record.canEdit) throw forbidden('This collection is read-only.')
}

export async function getInstanceInstructions() {
  return withAuthenticated(async (api) => {
    const admin = await adminApi(api)
    if (!admin) remoteAdminRequired()
    const settings = settingsSchema.parse(await withTimeout(admin.getSettings(), 'settings request'))
    return { text: settings.instanceInstructions }
  })
}

export async function setInstanceInstructions(text: string) {
  return withAuthenticated(async (api) => {
    const admin = await adminApi(api)
    if (!admin) remoteAdminRequired()
    await withTimeout(admin.setInstanceInstructions(text), 'instruction update')
    return { text }
  })
}

export async function listModels() {
  return withAuthenticated(async (api) => {
    const admin = await adminApi(api)
    let gateway: z.output<typeof gatewayModelsSchema> | undefined
    let builtInModelIds: Set<string>
    let gatewayStatus: z.output<typeof modelListSchema>['gatewayStatus']
    if (admin) {
      const settings = settingsSchema.parse(await withTimeout(admin.getSettings(), 'settings request'))
      gateway = settings.gatewayModels
      builtInModelIds = new Set(gateway?.models.map((model) => model.id) ?? [])
      gatewayStatus = gateway ? 'active' : 'inactive'
    } else {
      const aiConfig = aiConfigSchema.parse(await withTimeout(api.getAiConfig(), 'AI configuration request'))
      builtInModelIds = new Set(aiConfig.enabled ? aiConfig.builtInModelIds : [])
      gatewayStatus = 'unavailable'
    }

    const profiles = z.array(profileSchema).parse(await withTimeout(api.listModels('language'), 'model list request'))
    const accountProfiles = profiles.filter((profile) => !builtInModelIds.has(profile.id))
    const accountModels = await Promise.all(accountProfiles.map(async (profile) => {
      const model = z.object({ profile: profileSchema, config: z.unknown() }).parse(await withTimeout(api.getModelConfig(profile.id), 'model configuration request'))
      return mapAccountModel(model.profile, model.config)
    }))
    const enabledProviders = new Set(gateway?.providers ?? [])
    const gatewayProviders = (gateway?.providerSettings ?? []).map((provider) => ({
      provider: provider.provider,
      enabled: enabledProviders.has(provider.provider),
      ...(provider.enabledBy === undefined ? {} : { enabledBy: provider.enabledBy }),
      needsApiToken: provider.needsApiToken,
    }))
    const data = [...accountModels, ...(gateway?.models.map(mapGatewayModel) ?? [])]
    return modelListSchema.parse({ data, total: data.length, gatewayStatus, gatewayProviders })
  })
}

export async function getModel(key: string) {
  const result = await listModels()
  const model = result.data.find((item) => item.key === key)
  return model ?? notFound()
}

export async function listConnectors() {
  return withAuthenticated(async (api) => {
    const admin = await adminApi(api)
    if (!admin) remoteAdminRequired()
    const settings = settingsSchema.parse(await withTimeout(admin.getSettings(), 'settings request'))
    const data = settings.resourceVendors.map((vendor) => {
      const record = vendorSchema.parse(vendor)
      if (record.autoProvisions) return connectorRecordSchema.parse(record)
      return connectorRecordSchema.parse({
        ...record,
        resources: record.resources.map((resource) => ({ ...resource, urlPattern: safeResourcePattern(resource.urlPattern) })),
      })
    })
    return { data, total: data.length }
  })
}

export async function getConnector(vendorId: string) {
  const result = await listConnectors()
  const connector = result.data.find((item) => item.vendorId === vendorId)
  return connector ?? notFound()
}

export async function getContextCapabilities() {
  return withAuthenticated(async (api) => {
    const context = await contextApi(api)
    if (!context) return { available: false, canCreatePublic: false }
    const viewer = viewerInfoSchema.parse(await withTimeout(context.getViewerInfo(), 'Context viewer request'))
    return { available: true, canCreatePublic: viewer.isAdmin }
  })
}

export async function listContextCollections() {
  return withAuthenticated(async (api) => {
    const context = await contextApi(api)
    if (!context) return { data: [], total: 0, available: false, canCreatePublic: false }
    const viewer = viewerInfoSchema.parse(await withTimeout(context.getViewerInfo(), 'Context viewer request'))
    const enabled = enabledCollectionsSchema.parse(await withTimeout(context.listEnabledContextCollections(), 'Context collection list request'))
    const data = (await Promise.all(enabled.map(async ({ id }) => {
      try {
        return await collectionRecord(context, id)
      } catch (error) {
        if (error instanceof Error && error.message === 'not_found') return undefined
        throw error
      }
    }))).filter((item) => item !== undefined)
    return { data, total: data.length, available: true, canCreatePublic: viewer.isAdmin }
  })
}

export async function getContextCollection(id: string) {
  return withAuthenticated(async (api) => {
    const context = await contextApi(api)
    if (!context) contextUnavailable()
    return collectionRecord(context, id)
  })
}

export async function createContextCollection(input: { title: string; description: string; icon?: string; visibility: 'private' | 'public' }) {
  return withAuthenticated(async (api) => {
    const context = await contextApi(api)
    if (!context) contextUnavailable()
    const viewer = viewerInfoSchema.parse(await withTimeout(context.getViewerInfo(), 'Context viewer request'))
    if (input.visibility === 'public' && !viewer.isAdmin) throw forbidden('Cloudflare OS administrator access is required to create a public collection.')
    const created = collectionMetadataSchema.parse(await withTimeout(context.createContextCollection(
      input.title,
      input.description,
      input.visibility,
      input.icon || undefined,
      'web',
    ), 'Context collection create'))
    return collectionRecord(context, created.id)
  })
}

export async function updateContextCollection(id: string, input: { title?: string; description?: string; icon?: string }) {
  return withAuthenticated(async (api) => {
    const context = await contextApi(api)
    if (!context) contextUnavailable()
    const collection = await collectionRecord(context, id)
    requireWebEditable(collection)
    await withTimeout(context.updateContextCollection(id, input), 'Context collection update')
    return collectionRecord(context, id)
  })
}

export async function deleteContextCollection(id: string) {
  return withAuthenticated(async (api) => {
    const context = await contextApi(api)
    if (!context) contextUnavailable()
    const collection = await collectionRecord(context, id)
    if (collection.source !== 'web' || !collection.canDelete) throw forbidden('This collection cannot be deleted by this account.')
    await withTimeout(context.deleteContextCollection(id), 'Context collection delete')
    return { ok: true }
  })
}

async function editableContextCollection(api: AuthenticatedApi, id: string): Promise<{ context: ContextApi; collection: z.output<typeof collectionRecordSchema> }> {
  const context = await contextApi(api)
  if (!context) contextUnavailable()
  const collection = await collectionRecord(context, id)
  requireWebEditable(collection)
  return { context, collection }
}

export async function listContextDocuments(id: string) {
  return withAuthenticated(async (api) => {
    const context = await contextApi(api)
    if (!context) contextUnavailable()
    const collection = await collectionRecord(context, id)
    const documents = documentSummarySchema.parse(await withTimeout(context.listContextDocuments(id), 'Context document list request'))
    const data = documents.map((document) => contextDocumentSummarySchema.parse({
      ...document,
      lastUpdated: dateText(document.lastUpdated),
      collectionEditable: collection.source === 'web' && collection.canEdit,
    }))
    return { data, total: data.length }
  })
}

export async function getContextDocument(id: string, path: string) {
  return withAuthenticated(async (api) => {
    const context = await contextApi(api)
    if (!context) contextUnavailable()
    const documentValue = await withTimeout(context.getContextDocument(id, path), 'Context document request')
    if (documentValue === null) throw notFound()
    const document = documentSchema.parse(documentValue)
    return contextDocumentSchema.parse({ ...document, lastUpdated: dateText(document.lastUpdated) })
  })
}

export async function createContextItem(id: string, input: z.output<typeof contextItemCreateInputSchema>) {
  return withAuthenticated(async (api) => {
    const { context } = await editableContextCollection(api, id)
    if (input.kind === 'document') {
      const existing = await withTimeout(context.getContextDocument(id, input.path), 'Context document request')
      if (existing !== null) throw new HttpError(409, 'context_document_exists', 'A document already uses this path.')
      await withTimeout(context.putContextDocument(id, input.path, {
        description: input.description,
        body: input.body,
        contentType: input.contentType,
      }), 'Context document create')
      return getContextDocumentWithApi(context, id, input.path)
    }
    const body = `---\nname: ${JSON.stringify(input.name)}\ndescription: ${JSON.stringify(input.description)}\n---\n\n${input.body}`
    await withTimeout(context.createContextSkill(id, input.path, {
      description: input.description,
      body,
      contentType: 'text/markdown',
    }), 'Context skill create')
    return getContextDocumentWithApi(context, id, input.path)
  })
}

async function getContextDocumentWithApi(context: ContextApi, id: string, path: string) {
  const documentValue = await withTimeout(context.getContextDocument(id, path), 'Context document request')
  if (documentValue === null) throw notFound()
  const document = documentSchema.parse(documentValue)
  return contextDocumentSchema.parse({ ...document, lastUpdated: dateText(document.lastUpdated) })
}

export async function updateContextDocument(id: string, path: string, input: z.output<typeof contextItemUpdateInputSchema>) {
  return withAuthenticated(async (api) => {
    const { context } = await editableContextCollection(api, id)
    const existing = documentSchema.parse(await withTimeout(context.getContextDocument(id, path), 'Context document request'))
    const isSkill = existing.skillName !== undefined
    if (isSkill !== (input.kind === 'skill')) throw new HttpError(400, 'context_item_kind_changed')
    await withTimeout(context.putContextDocument(id, path, {
      description: input.kind === 'skill' ? existing.description : input.description,
      body: input.body,
      contentType: existing.contentType,
    }), 'Context document update')
    return getContextDocumentWithApi(context, id, path)
  })
}

export async function deleteContextDocument(id: string, path: string) {
  return withAuthenticated(async (api) => {
    const { context } = await editableContextCollection(api, id)
    const existing = documentSchema.parse(await withTimeout(context.getContextDocument(id, path), 'Context document request'))
    if (existing.skillName) await withTimeout(context.deleteContextSkill(id, path), 'Context skill delete')
    else await withTimeout(context.deleteContextDocument(id, path), 'Context document delete')
    return { ok: true }
  })
}

