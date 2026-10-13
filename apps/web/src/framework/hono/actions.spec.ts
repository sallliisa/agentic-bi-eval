import { Hono } from 'hono'
import { hc } from 'hono/client'
import { validator } from 'hono/validator'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod/v4'
import { createHonoResourceActions } from './actions'
import { collectionQueryFields } from './collectionQuery'

const app = new Hono()
  .get(
    '/rows/list',
    validator(
      'query',
      (value) =>
        value as {
          page?: string
          limit?: string
          search?: string
          sort?: string
          order?: string
          statusCode?: string
          active?: string
          enabled?: string
          zero?: string
          tags?: string
          details?: string
          at?: string
          blank?: string
          nullable?: string
        }
    ),
    (context) => context.json({ data: [{ id: '1', name: 'One' }], page: 1, limit: 10, total: 1 })
  )
  .get('/rows/detail/:id', (context) => context.json({ data: { id: context.req.param('id'), name: 'One' } }))
  .post(
    '/rows/create',
    validator('json', (value) => value as { name: string; nested: { value: string } }),
    (context) => context.json({ data: { id: '2', name: 'Two' } }, 201)
  )
  .patch(
    '/rows/update/:id',
    validator('json', (value) => value as { name: string; nested: { value: string } }),
    (context) => context.json({ data: { id: context.req.param('id'), name: 'Updated' } })
  )
  .delete('/rows/delete/:id', (context) => context.json({ deleted: context.req.param('id') }))

const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => app.fetch(new Request(String(input), init)))

const querySchema = z.object({
  ...collectionQueryFields,
  search: z.string().trim().optional(),
  sort_by: z.enum(['name', 'email']).optional(),
  statusCode: z.string().optional(),
  blank: z.string().optional(),
  nullable: z.string().nullable().optional(),
  enabled: z.boolean().optional(),
  zero: z.number().optional(),
  tags: z.array(z.string()).optional(),
  details: z.object({ role: z.string() }).optional(),
  at: z.date().optional(),
})

function requestQuery(index = 0) {
  const input = fetchMock.mock.calls[index]?.[0]
  return Object.fromEntries(new URL(String(input)).searchParams.entries())
}

afterEach(() => fetchMock.mockClear())

describe('createHonoResourceActions', () => {
  it('adapts a list-only route without a detail or mutation endpoint', async () => {
    const listApp = new Hono().get(
      '/records/list',
      validator('query', (value) => value as { page?: string; limit?: string; search?: string; sort?: string; order?: string }),
      (context) => context.json({ data: [{ id: '1', name: 'One' }], page: 1, limit: 10, total: 1 })
    )
    const listFetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => listApp.fetch(new Request(String(input), init)))
    const rpc = hc<typeof listApp>('https://api.test', { fetch: listFetch })
    const listQuerySchema = z.object({
      ...collectionQueryFields,
      sort_by: z.enum(['name']).optional(),
    })
    const actions = createHonoResourceActions(rpc.records, { querySchema: listQuerySchema })

    expect(listFetch).not.toHaveBeenCalled()
    await expect(actions.list({ query: { page: 2, sort_by: 'name' }, searchParameters: {} })).resolves.toEqual({
      data: [{ id: '1', name: 'One' }],
      meta: { page: 1, pageSize: 10, total: 1, totalPage: 1 },
    })
    expect(new URL(String(listFetch.mock.calls[0]?.[0])).searchParams.get('sort')).toBe('name')
    expect(new URL(String(listFetch.mock.calls[0]?.[0])).searchParams.get('page')).toBe('2')
  })

  it('adapts a create-only route without list configuration', async () => {
    const createApp = new Hono().post(
      '/entries/create',
      validator('json', (value) => value as { name: string }),
      (context) => context.json({ data: { id: '1', name: context.req.valid('json').name } }, 201)
    )
    const createFetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => createApp.fetch(new Request(String(input), init)))
    const rpc = hc<typeof createApp>('https://api.test', { fetch: createFetch })
    const actions = createHonoResourceActions(rpc.entries)

    expect(createFetch).not.toHaveBeenCalled()
    await expect(Reflect.get(actions, 'list')({ query: {}, searchParameters: {} })).rejects.toThrow(/list.*querySchema.*parseAsync/)
    expect(createFetch).not.toHaveBeenCalled()
    await expect(actions.create({ name: 'Created' })).resolves.toEqual({ id: '1', name: 'Created' })
    expect(createFetch).toHaveBeenCalledTimes(1)
    expect(createFetch.mock.calls[0]?.[1]?.body).toBe(JSON.stringify({ name: 'Created' }))
  })

  it('adapts update and detail routes without list configuration', async () => {
    const updateApp = new Hono()
      .get('/records/detail/:id', (context) => context.json({ data: { id: context.req.param('id'), name: 'Before' } }))
      .patch(
        '/records/update/:id',
        validator('json', (value) => value as { name: string }),
        (context) => context.json({ data: { id: context.req.param('id'), name: context.req.valid('json').name } })
      )
    const updateFetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => updateApp.fetch(new Request(String(input), init)))
    const rpc = hc<typeof updateApp>('https://api.test', { fetch: updateFetch })
    const actions = createHonoResourceActions(rpc.records)

    expect(updateFetch).not.toHaveBeenCalled()
    await expect(actions.detail({ id: '1', searchParameters: {} })).resolves.toEqual({ id: '1', name: 'Before' })
    await expect(actions.update('1', { name: 'After' })).resolves.toEqual({ id: '1', name: 'After' })
    expect(updateFetch).toHaveBeenCalledTimes(2)
    expect(updateFetch.mock.calls[1]?.[1]?.body).toBe(JSON.stringify({ name: 'After' }))
  })

  it('validates and encodes one canonical query while preserving the endpoint protocol', async () => {
    const rpc = hc<typeof app>('https://api.test', { fetch: fetchMock })
    const actions = createHonoResourceActions(rpc.rows, { querySchema })
    const at = new Date('2026-08-26T00:00:00.000Z')
    const signal = new AbortController().signal
    const query = {
      page: 2,
      limit: 10,
      search: ' Ada ',
      sort_by: 'name' as const,
      sort: 'asc' as const,
      statusCode: 'active',
      blank: '',
      nullable: null,
      enabled: false,
      zero: 0,
      tags: ['low', 'high'],
      details: { role: 'admin' },
      at,
    }
    const searchParameters = { page: 9, search: 'Context', statusCode: 'inactive', active: true }

    await expect(
      actions.list({
        query,
        searchParameters,
        signal,
      })
    ).resolves.toEqual({
      data: [{ id: '1', name: 'One' }],
      meta: { page: 1, pageSize: 10, total: 1, totalPage: 1 },
    })

    expect(requestQuery()).toEqual({
      page: '2',
      limit: '10',
      search: 'Ada',
      sort: 'name',
      order: 'asc',
      statusCode: 'active',
      enabled: 'false',
      zero: '0',
      tags: '["low","high"]',
      details: '{"role":"admin"}',
      at: String(at),
      active: 'true',
    })
    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBe(signal)
    expect(query).toEqual({
      page: 2,
      limit: 10,
      search: ' Ada ',
      sort_by: 'name',
      sort: 'asc',
      statusCode: 'active',
      blank: '',
      nullable: null,
      enabled: false,
      zero: 0,
      tags: ['low', 'high'],
      details: { role: 'admin' },
      at,
    })
    expect(searchParameters).toEqual({ page: 9, search: 'Context', statusCode: 'inactive', active: true })

    await actions.list({ query: { sort_by: 'email', sort: 'desc' }, searchParameters: {} })
    expect(requestQuery(1)).toEqual({ sort: 'email', order: 'desc' })

    await actions.list({ query: {}, searchParameters: {} })
    expect(requestQuery(2)).toEqual({})

    await expect(actions.detail({ id: '1', searchParameters: {} })).resolves.toEqual({ id: '1', name: 'One' })
    const createInput = { name: 'Two', nested: { value: 'create' } }
    const updateInput = { name: 'Updated', nested: { value: 'update' } }
    await expect(actions.create(createInput)).resolves.toEqual({ id: '2', name: 'Two' })
    await expect(actions.update('1', updateInput)).resolves.toEqual({ id: '1', name: 'Updated' })
    await expect(actions.delete('1')).resolves.toEqual({ deleted: '1' })
    expect(await fetchMock.mock.calls.find(([input]) => String(input).includes('/rows/create'))?.[1]).toMatchObject({ body: JSON.stringify(createInput) })
    expect(await fetchMock.mock.calls.find(([input]) => String(input).includes('/rows/update/1'))?.[1]).toMatchObject({ body: JSON.stringify(updateInput) })
  })

  it('awaits one query parse for direct loader calls', async () => {
    let transforms = 0
    const directQuerySchema = z
      .object({
        ...collectionQueryFields,
        sort_by: z.enum(['name', 'email']).optional(),
      })
      .transform(async (query) => {
        transforms += 1
        await Promise.resolve()
        return query
      })
    const rpc = hc<typeof app>('https://api.test', { fetch: fetchMock })
    const actions = createHonoResourceActions(rpc.rows, { querySchema: directQuerySchema })

    await actions.list({ query: {}, searchParameters: { active: true } })

    expect(transforms).toBe(1)
    expect(requestQuery()).toEqual({ active: 'true' })

    await actions.list({ query: { sort_by: 'email' }, searchParameters: { active: false } })

    expect(transforms).toBe(2)
    expect(requestQuery(1)).toEqual({ sort: 'email', active: 'false' })
  })

  it('does not dispatch when the query schema rejects a sort key', async () => {
    const rpc = hc<typeof app>('https://api.test', { fetch: fetchMock })
    const actions = createHonoResourceActions(rpc.rows, { querySchema })

    await expect(actions.list({ query: { sort_by: 'statusCode' } as never, searchParameters: {} })).rejects.toMatchObject({
      issues: expect.any(Array),
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('throws the failed payload once', async () => {
    const rpc = hc<typeof app>('https://api.test', {
      fetch: async () => new Response(JSON.stringify({ error: 'bad' }), { status: 400 }),
    })
    const actions = createHonoResourceActions(rpc.rows, { querySchema })
    await expect(actions.list({ query: {}, searchParameters: {} })).rejects.toEqual({ error: 'bad' })
  })

  it('marks rejected write requests as uncertain after dispatch', async () => {
    const failedFetch = vi.fn(async () => {
      throw new Error('The connection closed.')
    })
    const rpc = hc<typeof app>('https://api.test', { fetch: failedFetch })
    const actions = createHonoResourceActions(rpc.rows, { querySchema })

    await expect(actions.create({ name: 'One', nested: { value: 'one' } })).rejects.toMatchObject({
      message: 'The connection closed.',
      operation: 'create',
      retryable: false,
      postWrite: true,
      writeOutcome: 'uncertain',
    })
    expect(failedFetch).toHaveBeenCalledOnce()
  })

  it.each([
    [408, JSON.stringify({ message: 'Request timed out.' })],
    [500, JSON.stringify({ message: 'The server failed.', errors: { name: ['Unavailable.'] } })],
    [201, '{'],
  ])('marks an HTTP %s response with no reliable write result as uncertain', async (status, body) => {
    const responseFetch = vi.fn(async () => new Response(body, { status }))
    const rpc = hc<typeof app>('https://api.test', { fetch: responseFetch })
    const actions = createHonoResourceActions(rpc.rows, { querySchema })

    await expect(actions.create({ name: 'One', nested: { value: 'one' } })).rejects.toMatchObject({
      operation: 'create',
      retryable: false,
      postWrite: true,
      writeOutcome: 'uncertain',
    })
    expect(responseFetch).toHaveBeenCalledOnce()
  })

  it('keeps definite write rejections ordinary and preserves server issues', async () => {
    const responseFetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            message: 'Name is required.',
            errors: { name: ['Required.'] },
            postWrite: true,
            writeOutcome: 'confirmed',
            result: { id: 'unexpected' },
          }),
          { status: 422 }
        )
    )
    const rpc = hc<typeof app>('https://api.test', { fetch: responseFetch })
    const actions = createHonoResourceActions(rpc.rows, { querySchema })
    const error = await actions.create({ name: '', nested: { value: 'invalid' } }).then(
      () => undefined,
      (caught: unknown) => caught
    )

    expect(error).toMatchObject({
      message: 'Name is required.',
      issues: [{ path: ['name'], message: 'Required.' }],
    })
    expect(error).not.toHaveProperty('postWrite')
    expect(error).not.toHaveProperty('writeOutcome')
    expect(error).not.toHaveProperty('result')
    expect(responseFetch).toHaveBeenCalledOnce()
  })

  it('does not add write metadata to failed reads', async () => {
    const responseFetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            message: 'Read unavailable.',
            postWrite: true,
            writeOutcome: 'confirmed',
            result: { id: 'unexpected' },
            refresh: 'not-a-callback',
          }),
          { status: 503 }
        )
    )
    const rpc = hc<typeof app>('https://api.test', { fetch: responseFetch })
    const actions = createHonoResourceActions(rpc.rows, { querySchema })
    const error = await actions.list({ query: {}, searchParameters: {} }).then(
      () => undefined,
      (caught: unknown) => caught
    )

    expect(error).toEqual({ message: 'Read unavailable.' })
    expect(error).not.toHaveProperty('postWrite')
    expect(error).not.toHaveProperty('writeOutcome')
    expect(error).not.toHaveProperty('result')
    expect(error).not.toHaveProperty('refresh')
    expect(responseFetch).toHaveBeenCalledOnce()
  })

  it('rejects a non-object route and names a malformed operation when it is invoked', async () => {
    expect(() => createHonoResourceActions(undefined as never)).toThrow(/kebab-case|rpc\[/)
    const actions = createHonoResourceActions({} as never)
    const error = await Reflect.get(
      actions,
      'create'
    )({ name: 'One' }).then(
      () => undefined,
      (caught: unknown) => caught
    )
    expect(error).toMatchObject({ message: expect.stringMatching(/create operation could not be invoked/) })
    expect(error).not.toHaveProperty('postWrite')
    expect(error).not.toHaveProperty('writeOutcome')
  })

  it('accepts hyphenated first segments', async () => {
    const rpc = hc<typeof app>('https://api.test', { fetch: fetchMock })
    const hyphenated = { 'coffee-variants': rpc.rows }
    const actions = createHonoResourceActions(hyphenated['coffee-variants'], { querySchema })
    await expect(actions.list({ query: {}, searchParameters: {} })).resolves.toEqual({
      data: [{ id: '1', name: 'One' }],
      meta: { page: 1, pageSize: 10, total: 1, totalPage: 1 },
    })
  })
})
