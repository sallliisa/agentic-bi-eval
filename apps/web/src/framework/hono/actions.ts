import type { ClientRequestOptions } from 'hono/client'
import { dataAdapter } from '@/framework/adapters/data/normalize'
import type { CollectionLoadContext, CollectionResult, RecordIdentity, SubmitError } from '@southneuhof/loom'
import type { HonoQuerySchemaGuard, HonoResourceActions } from './contracts'
import { encodeCollectionQuery } from './collectionQuery'

type RuntimeEndpoint = (input?: unknown, options?: ClientRequestOptions) => Promise<Response>
type CollectionQuerySchema = {
  readonly _output: object
  parseAsync(input: unknown): Promise<object>
}

type RouteWithoutList<TRoute> = 'list' extends keyof HonoResourceActions<TRoute> ? never : unknown

function wireQuery(values: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(values)
      .filter(([, value]) => value != null && value !== '')
      .map(([key, value]) => [key, Array.isArray(value) || (typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype) ? JSON.stringify(value) : String(value)])
  )
}

function wireIdentity(id: RecordIdentity): string {
  return typeof id === 'object' ? Object.values(id).map(String).join('/') : String(id)
}

async function payload(response: Response): Promise<unknown> {
  return response.json()
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function uncertainWriteError(operation: string, error: unknown): SubmitError {
  const normalized = dataAdapter.normalizeError(error)
  return {
    message: normalized.message,
    ...(normalized.issues ? { issues: normalized.issues } : {}),
    code: 'HONO_WRITE_OUTCOME_UNCERTAIN',
    operation,
    retryable: false,
    postWrite: true,
    writeOutcome: 'uncertain',
  }
}

async function readPayload(response: Response): Promise<unknown> {
  const value = await payload(response)
  if (!response.ok) throw withoutWriteCompletion(value)
  return value
}

function withoutWriteCompletion(value: unknown): unknown {
  if (!isRecord(value)) return value
  const completionMembers = new Set(['postWrite', 'writeOutcome', 'result', 'refresh'])
  if (![...completionMembers].some((member) => Object.hasOwn(value, member))) return value
  const result: Record<string, unknown> = {}
  for (const member of Object.keys(value)) {
    if (completionMembers.has(member)) continue
    result[member] = Reflect.get(value, member)
  }
  return result
}

function uncertainResponse(response: Response): boolean {
  return response.status < 400 || response.status === 408 || response.status >= 500
}

function definiteWriteRejection(error: unknown): SubmitError {
  const normalized = dataAdapter.normalizeError(error)
  return {
    message: normalized.message,
    ...(normalized.issues ? { issues: normalized.issues } : {}),
  }
}

async function writePayload(response: Response, operation: string): Promise<unknown> {
  let value: unknown
  try {
    value = await payload(response)
  } catch (error) {
    if (uncertainResponse(response)) {
      throw uncertainWriteError(operation, error)
    }
    throw definiteWriteRejection(new Error(`Hono ${operation} operation was rejected with HTTP ${response.status}.`, { cause: error }))
  }
  if (!response.ok) {
    if (uncertainResponse(response)) throw uncertainWriteError(operation, value)
    throw definiteWriteRejection(value)
  }
  return value
}

async function requestFor(operation: string, request: () => Promise<Response>, write = false): Promise<Response> {
  let pending: Promise<Response>
  try {
    pending = request()
  } catch (error) {
    throw new Error(`Hono ${operation} operation could not be invoked.`, { cause: error })
  }
  try {
    return await pending
  } catch (error) {
    const cause = new Error(`Hono ${operation} operation could not be invoked.`, { cause: error })
    if (write) throw uncertainWriteError(operation, error)
    throw cause
  }
}

function isRuntimeEndpoint(value: unknown): value is RuntimeEndpoint {
  return typeof value === 'function'
}

function routeEndpoint(route: unknown, path: readonly string[]): RuntimeEndpoint {
  let endpoint: unknown = route
  for (const part of path) {
    if (endpoint === null || (typeof endpoint !== 'object' && typeof endpoint !== 'function')) {
      throw new Error(`Hono ${path[0]} operation endpoint is unavailable.`)
    }
    endpoint = Reflect.get(endpoint, part)
  }
  if (!isRuntimeEndpoint(endpoint)) throw new Error(`Hono ${path[0]} operation endpoint is unavailable.`)
  return endpoint
}

export function createHonoResourceActions<const TRoute>(route: TRoute & RouteWithoutList<TRoute>, options?: never): HonoResourceActions<TRoute>
export function createHonoResourceActions<const TRoute, const TSchema extends CollectionQuerySchema>(
  route: TRoute,
  options: { querySchema: TSchema & HonoQuerySchemaGuard<TRoute, TSchema> }
): HonoResourceActions<TRoute, TSchema['_output']>
export function createHonoResourceActions(route: unknown, options?: { querySchema?: CollectionQuerySchema }): unknown {
  if (route === null || (typeof route !== 'object' && typeof route !== 'function')) throw new Error("Unknown resource route. Use the kebab-case route key: rpc['<route-dir>'].")

  const actions = {
    list: async ({ query, searchParameters, signal }: CollectionLoadContext<Record<string, unknown>>) => {
      const querySchema = options?.querySchema
      if (!querySchema || typeof querySchema.parseAsync !== 'function') throw new Error('Hono list operation requires a querySchema with parseAsync.')
      const parsedQuery = await querySchema.parseAsync(query)
      const values = encodeCollectionQuery({ ...searchParameters, ...parsedQuery })
      return dataAdapter.normalizeCollection(
        await readPayload(await requestFor('list', () => routeEndpoint(route, ['list', '$get'])({ query: wireQuery(values) }, { init: { signal } })))
      ) as CollectionResult<Record<string, unknown>>
    },
    detail: async ({ id, searchParameters, signal }: { id?: RecordIdentity; searchParameters: Record<string, unknown>; signal?: AbortSignal }) => {
      if (id === undefined) return undefined
      return dataAdapter.normalizeRecord(
        await readPayload(
          await requestFor('detail', () => routeEndpoint(route, ['detail', ':id', '$get'])({ param: { id: wireIdentity(id) }, query: wireQuery(searchParameters) }, { init: { signal } }))
        )
      )
    },
    create: async (input: object) => dataAdapter.normalizeRecord(await writePayload(await requestFor('create', () => routeEndpoint(route, ['create', '$post'])({ json: input }), true), 'create')),
    update: async (id: RecordIdentity, input: object) =>
      dataAdapter.normalizeRecord(
        await writePayload(await requestFor('update', () => routeEndpoint(route, ['update', ':id', '$patch'])({ param: { id: wireIdentity(id) }, json: input }), true), 'update')
      ),
    delete: async (id: RecordIdentity) => writePayload(await requestFor('delete', () => routeEndpoint(route, ['delete', ':id', '$delete'])({ param: { id: wireIdentity(id) } }), true), 'delete'),
  }
  return actions
}
