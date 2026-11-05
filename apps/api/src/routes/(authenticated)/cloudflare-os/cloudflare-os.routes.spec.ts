import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { app } from '../../../app'
import { closeDb } from '../../../db'
import { createSystemSession } from '../../../testing/session'

const rpcMock = vi.hoisted(() => ({
  sessionsCreated: 0,
  adminAvailable: false,
  contextAvailable: false,
  whoami: vi.fn(),
  getSettings: vi.fn(),
  setInstanceInstructions: vi.fn(),
  listModels: vi.fn(),
  getModelConfig: vi.fn(),
  getAiConfig: vi.fn(),
  context: {
    getViewerInfo: vi.fn(),
    createContextCollection: vi.fn(),
    updateContextCollection: vi.fn(),
    deleteContextCollection: vi.fn(),
    getContextCollectionMetadata: vi.fn(),
    listContextDocuments: vi.fn(),
    getContextDocument: vi.fn(),
    putContextDocument: vi.fn(),
    createContextSkill: vi.fn(),
    deleteContextDocument: vi.fn(),
    deleteContextSkill: vi.fn(),
    listEnabledContextCollections: vi.fn(),
    getContextCollectionPermissions: vi.fn(),
  },
}))

vi.mock('hash-wasm', () => ({ argon2id: vi.fn(async () => new Uint8Array(32)) }))
vi.mock('capnweb', () => ({
  newWebSocketRpcSession: vi.fn(() => {
    rpcMock.sessionsCreated += 1
    return {
      ping: async () => undefined,
      getServerConfig: async () => ({ passwordAuthEnabled: true }),
      login: async () => 'session-token',
      authenticate: async () => ({
        whoami: rpcMock.whoami,
        getAdminApi: async () => rpcMock.adminAvailable ? {
          getSettings: rpcMock.getSettings,
          setInstanceInstructions: rpcMock.setInstanceInstructions,
        } : null,
        listModels: rpcMock.listModels,
        getModelConfig: rpcMock.getModelConfig,
        getAiConfig: rpcMock.getAiConfig,
        getGatekeeperApp: async () => rpcMock.contextAvailable ? { ui: rpcMock.context } : null,
      }),
      [Symbol.dispose]: () => undefined,
    }
  }),
}))

const oldEnvironment = {
  endpoint: process.env.CLOUDFLARE_OS_ENDPOINT,
  username: process.env.CLOUDFLARE_OS_USERNAME,
  password: process.env.CLOUDFLARE_OS_PASSWORD,
}

const collectionMetadata = {
  id: 'owned-private-fixture',
  title: 'Owned Private Fixture',
  description: 'Test only.',
  visibility: 'private',
  created: '2026-10-29T00:00:00.000Z',
  lastUpdated: '2026-10-29T00:00:00.000Z',
  documentCount: 0,
  content: { source: 'web' },
}

const skillDocument = {
  path: 'ops/SKILL.md',
  name: 'SKILL.md',
  description: 'Operations instructions.',
  contentType: 'text/markdown',
  body: '---\nname: "ops"\ndescription: "Operations instructions."\nallowed-tools:\n  - read_file\nmetadata:\n  owner: "fixture"\ndisable-model-invocation: true\n---\n\n# Operations\nPreserve this body.',
  skillName: 'ops',
  lastUpdated: '2026-10-29T00:00:00.000Z',
}

function request(method: string, path: string, cookie: string, body?: unknown) {
  return app.request(path, {
    method,
    headers: { Cookie: cookie, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
}

function resetContext() {
  rpcMock.context.getViewerInfo.mockResolvedValue({ isAdmin: true, supportsGitCollections: false })
  rpcMock.context.createContextCollection.mockResolvedValue(collectionMetadata)
  rpcMock.context.updateContextCollection.mockResolvedValue(undefined)
  rpcMock.context.deleteContextCollection.mockResolvedValue(undefined)
  rpcMock.context.getContextCollectionMetadata.mockResolvedValue(collectionMetadata)
  rpcMock.context.listContextDocuments.mockResolvedValue([])
  rpcMock.context.getContextDocument.mockResolvedValue(null)
  rpcMock.context.putContextDocument.mockResolvedValue(undefined)
  rpcMock.context.createContextSkill.mockResolvedValue(undefined)
  rpcMock.context.deleteContextDocument.mockResolvedValue(undefined)
  rpcMock.context.deleteContextSkill.mockResolvedValue(undefined)
  rpcMock.context.listEnabledContextCollections.mockResolvedValue([])
  rpcMock.context.getContextCollectionPermissions.mockResolvedValue({ canEdit: true, canDelete: true })
}

describe('Cloudflare OS management routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CLOUDFLARE_OS_ENDPOINT = 'http://localhost:8787'
    process.env.CLOUDFLARE_OS_USERNAME = 'route-test-user'
    process.env.CLOUDFLARE_OS_PASSWORD = 'route-test-password'
    rpcMock.sessionsCreated = 0
    rpcMock.adminAvailable = false
    rpcMock.contextAvailable = false
    rpcMock.whoami.mockResolvedValue({ type: 'user' })
    rpcMock.getSettings.mockResolvedValue({ instanceInstructions: '', resourceVendors: [] })
    rpcMock.setInstanceInstructions.mockResolvedValue(undefined)
    rpcMock.listModels.mockResolvedValue([])
    rpcMock.getModelConfig.mockResolvedValue(null)
    rpcMock.getAiConfig.mockResolvedValue({ enabled: false })
    resetContext()
  })

  afterAll(async () => {
    if (oldEnvironment.endpoint === undefined) delete process.env.CLOUDFLARE_OS_ENDPOINT
    else process.env.CLOUDFLARE_OS_ENDPOINT = oldEnvironment.endpoint
    if (oldEnvironment.username === undefined) delete process.env.CLOUDFLARE_OS_USERNAME
    else process.env.CLOUDFLARE_OS_USERNAME = oldEnvironment.username
    if (oldEnvironment.password === undefined) delete process.env.CLOUDFLARE_OS_PASSWORD
    else process.env.CLOUDFLARE_OS_PASSWORD = oldEnvironment.password
    await closeDb()
  })

  it('denies local access before opening a Cloudflare OS session', async () => {
    const session = await createSystemSession([], 'cloudflare-os-no-access')
    const response = await request('GET', '/cloudflare-os/models', session.cookie)

    expect(response.status).toBe(403)
    expect(rpcMock.sessionsCreated).toBe(0)
  })

  it('returns missing upstream capabilities without enabling writes', async () => {
    const session = await createSystemSession(['view-agent-instructions', 'manage-agent-instructions', 'view-skills-context', 'manage-skills-context'], 'cloudflare-os-capabilities')
    const instructions = await request('GET', '/cloudflare-os/instructions', session.cookie)
    const capabilities = await request('GET', '/cloudflare-os/context-capabilities', session.cookie)
    const collections = await request('GET', '/cloudflare-os/context-collections', session.cookie)
    const collectionCreate = await request('POST', '/cloudflare-os/context-collections', session.cookie, {
      title: 'Private collection', description: '', visibility: 'private',
    })

    expect(instructions.status).toBe(403)
    expect(capabilities.status).toBe(200)
    expect(await capabilities.json()).toEqual({ available: false, canCreatePublic: false })
    expect(await collections.json()).toMatchObject({ available: false, total: 0, data: [] })
    expect(collectionCreate.status).toBe(503)
    expect(rpcMock.context.createContextCollection).not.toHaveBeenCalled()
  })

  it('saves instance instructions only after both local and upstream authorization', async () => {
    rpcMock.adminAvailable = true
    const session = await createSystemSession(['manage-agent-instructions'], 'cloudflare-os-instructions')
    const response = await request('PUT', '/cloudflare-os/instructions', session.cookie, { text: 'Use short answers.' })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ data: { text: 'Use short answers.' } })
    expect(rpcMock.setInstanceInstructions).toHaveBeenCalledWith('Use short answers.')
  })

  it('hides model credentials and secret-bearing endpoint parts', async () => {
    rpcMock.listModels.mockResolvedValue([
      { type: 'language', id: 'muse-spark', name: 'Muse Spark' },
      { type: 'language', id: 'gateway-model', name: 'Gateway Model' },
    ])
    rpcMock.getAiConfig.mockResolvedValue({ enabled: true, builtInModelIds: ['gateway-model'] })
    rpcMock.getModelConfig.mockImplementation(async (id: string) => {
      if (id === 'gateway-model') throw new Error('Gateway models do not have user config.')
      return {
        profile: { type: 'language', id: 'muse-spark', name: 'Muse Spark' },
        config: {
          provider: 'ollama',
          model: 'muse-spark:1.3',
          apiUrl: 'https://user:password@models.example/v1?access_token=query-secret#private-fragment',
          contextWindow: 32768,
          outputLimit: 4096,
          apiKey: 'model-secret',
          headers: { Authorization: 'Bearer header-secret' },
        },
      }
    })
    const session = await createSystemSession(['view-model-providers'], 'cloudflare-os-models')
    const response = await request('GET', '/cloudflare-os/models', session.cookie)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toMatchObject({
      gatewayStatus: 'unavailable',
      data: [{ provider: 'ollama', model: 'muse-spark:1.3', endpoint: 'https://models.example/v1' }],
    })
    expect(payload.total).toBe(1)
    expect(rpcMock.getModelConfig).toHaveBeenCalledTimes(1)
    expect(rpcMock.getModelConfig).toHaveBeenCalledWith('muse-spark')
    const serialized = JSON.stringify(payload)
    expect(serialized).not.toContain('password')
    expect(serialized).not.toContain('query-secret')
    expect(serialized).not.toContain('private-fragment')
    expect(serialized).not.toContain('model-secret')
    expect(serialized).not.toContain('header-secret')
  })

  it('lists gateway and account models without reading gateway model configs', async () => {
    rpcMock.adminAvailable = true
    rpcMock.getSettings.mockResolvedValue({
      instanceInstructions: '',
      resourceVendors: [],
      gatewayModels: {
        providers: ['cloudflare'],
        providerSettings: [{ provider: 'cloudflare', needsApiToken: false }],
        models: [{
          provider: 'cloudflare',
          id: 'gateway-model',
          name: 'Gateway Model',
          contextWindow: 8192,
          mode: 'enabled',
          added: true,
          runtimeKnown: true,
        }],
      },
    })
    rpcMock.listModels.mockResolvedValue([
      { type: 'language', id: 'account-model', name: 'Account Model' },
      { type: 'language', id: 'gateway-model', name: 'Gateway Model' },
    ])
    rpcMock.getModelConfig.mockImplementation(async (id: string) => {
      if (id === 'gateway-model') throw new Error('Gateway models do not have user config.')
      return {
        profile: { type: 'language', id: 'account-model', name: 'Account Model' },
        config: { provider: 'ollama', model: 'local-model' },
      }
    })
    const session = await createSystemSession(['view-model-providers'], 'cloudflare-os-mixed-models')
    const response = await request('GET', '/cloudflare-os/models', session.cookie)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.data).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'account:account-model', source: 'account' }),
      expect.objectContaining({ key: 'gateway:gateway-model', source: 'gateway' }),
    ]))
    expect(payload.data).toHaveLength(2)
    expect(rpcMock.getModelConfig).toHaveBeenCalledTimes(1)
    expect(rpcMock.getModelConfig).toHaveBeenCalledWith('account-model')
  })

  it('denies edits to Git collections and web collections without upstream edit permission', async () => {
    rpcMock.contextAvailable = true
    const session = await createSystemSession(['manage-skills-context'], 'cloudflare-os-readonly')
    rpcMock.context.getContextCollectionMetadata.mockResolvedValue({ ...collectionMetadata, content: { source: 'git' } })
    const gitEdit = await request('PATCH', '/cloudflare-os/context-collections/owned-private-fixture', session.cookie, { title: 'Changed' })
    rpcMock.context.getContextCollectionMetadata.mockResolvedValue(collectionMetadata)
    rpcMock.context.getContextCollectionPermissions.mockResolvedValue({ canEdit: false, canDelete: false })
    const permissionEdit = await request('PATCH', '/cloudflare-os/context-collections/owned-private-fixture', session.cookie, { title: 'Changed' })

    expect(gitEdit.status).toBe(403)
    expect(permissionEdit.status).toBe(403)
    expect(rpcMock.context.updateContextCollection).not.toHaveBeenCalled()
  })

  it('preserves skill frontmatter and body while using Context skill methods for create and delete', async () => {
    rpcMock.contextAvailable = true
    const session = await createSystemSession(['manage-skills-context'], 'cloudflare-os-skills')
    rpcMock.context.getContextDocument.mockResolvedValue(skillDocument)
    const updatedSkillBody = '---\nname: "ops-v2"\ndescription: "Updated operations instructions."\nallowed-tools:\n  - read_file\nmetadata:\n  owner: "fixture"\ndisable-model-invocation: true\n---\n\n# Updated operations\nPreserve this updated body.'
    const created = await request('POST', '/cloudflare-os/context-collections/owned-private-fixture/skills', session.cookie, {
      kind: 'skill',
      path: 'ops/SKILL.md',
      name: 'ops',
      description: 'Operations instructions.',
      body: '# Operations',
    })
    const updated = await request('PATCH', '/cloudflare-os/context-collections/owned-private-fixture/document/ops%2FSKILL.md', session.cookie, {
      kind: 'skill',
      body: updatedSkillBody,
    })
    const deleted = await request('DELETE', '/cloudflare-os/context-collections/owned-private-fixture/document/ops%2FSKILL.md', session.cookie)

    expect(created.status).toBe(201)
    expect(rpcMock.context.createContextSkill).toHaveBeenCalledWith('owned-private-fixture', 'ops/SKILL.md', {
      description: 'Operations instructions.',
      body: '---\nname: "ops"\ndescription: "Operations instructions."\n---\n\n# Operations',
      contentType: 'text/markdown',
    })
    expect(updated.status).toBe(200)
    expect(rpcMock.context.putContextDocument).toHaveBeenCalledWith('owned-private-fixture', 'ops/SKILL.md', {
      description: 'Operations instructions.',
      body: updatedSkillBody,
      contentType: 'text/markdown',
    })
    expect(deleted.status).toBe(200)
    expect(rpcMock.context.deleteContextSkill).toHaveBeenCalledWith('owned-private-fixture', 'ops/SKILL.md')
    expect(rpcMock.context.deleteContextDocument).not.toHaveBeenCalled()
  })

  it('removes credentials and query data from advertised connector patterns', async () => {
    rpcMock.adminAvailable = true
    rpcMock.getSettings.mockResolvedValue({
      instanceInstructions: '',
      resourceVendors: [{
        vendorId: 'internal-api',
        displayName: 'Internal API',
        autoProvisions: false,
        enabled: true,
        resources: [{
          urlPattern: 'https://user:password@internal.example/v1?token=connector-secret#hidden',
          title: 'Records',
          description: 'Read records.',
          enabled: true,
        }],
      }],
    })
    const session = await createSystemSession(['view-connectors'], 'cloudflare-os-connectors')
    const response = await request('GET', '/cloudflare-os/connectors', session.cookie)
    const payload = await response.json()
    const serialized = JSON.stringify(payload)

    expect(response.status).toBe(200)
    expect(payload).toMatchObject({ data: [{ resources: [{ urlPattern: 'https://internal.example/v1' }] }] })
    expect(serialized).not.toContain('password')
    expect(serialized).not.toContain('connector-secret')
    expect(serialized).not.toContain('hidden')
  })
})
