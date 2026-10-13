import { Hono } from 'hono'
import { hc } from 'hono/client'
import { validator } from 'hono/validator'
import { createApp, defineComponent, h, nextTick, ref, type Component } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod/v4'
import { defineResource, defineTable, FrameworkPlugin, createFrameworkQueryClient, ListView, FormView, resetResourceRuntimeForTests } from '@southneuhof/loom'
import { collectionQueryFields } from './collectionQuery'
import { createHonoResourceActions } from './actions'
import { dataAdapter } from '../adapters/data/normalize'

type Row = { id: string; name: string }

const rowSchema = z.object({ id: z.string(), name: z.string() })
const createSchema = z.object({ name: z.string().trim().min(1) })
const querySchema = z.object({ ...collectionQueryFields, sort_by: z.enum(['name']).optional() })

function createApi() {
  const app = new Hono()
    .get(
      '/records/list',
      validator('query', (value) => value),
      (context) =>
        context.json({
          data: [
            { id: '1', name: 'Current' },
            { id: '3', name: 'Another' },
          ],
          page: 1,
          limit: 10,
          total: 2,
        })
    )
    .get('/records/detail/:id', (context) => context.json({ data: { id: context.req.param('id'), name: 'Current' } }))
    .post(
      '/records/create',
      validator('json', (value) => createSchema.parse(value)),
      (context) => context.json({ data: { id: '2', name: context.req.valid('json').name } }, 201)
    )
    .patch(
      '/records/update/:id',
      validator('json', (value) => createSchema.parse(value)),
      (context) => context.json({ data: { id: context.req.param('id'), name: context.req.valid('json').name } })
    )
    .delete('/records/delete/:id', (context) => context.json({ deleted: context.req.param('id') }))
  const requests: { method: string; path: string }[] = []
  const completions: unknown[] = []
  let intercept: (request: Request) => Promise<Response | undefined> | Response | undefined = () => undefined
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(String(input), init)
    const url = new URL(request.url)
    requests.push({ method: request.method, path: url.pathname })
    return (await intercept(request)) ?? app.fetch(request)
  })
  const rpc = hc<typeof app>('https://api.test', { fetch: fetchMock })
  const actions = createHonoResourceActions(rpc.records, { querySchema })
  const table = defineTable({ schema: rowSchema, columns: { name: {} } })
  const resource = defineResource({
    key: 'records',
    identity: (record: Row) => record.id,
    list: {
      permission: null,
      table: { ...table, load: actions.list },
    },
    create: {
      permission: null,
      form: { schema: createSchema, fields: { name: { renderer: 'text' } }, submit: actions.create, initialData: { name: 'Created' } },
      afterSubmit: async ({ result, navigate }) => {
        completions.push(result)
        await navigate('/complete')
      },
    },
    update: {
      permission: null,
      form: ({ id }) => ({
        schema: createSchema,
        fields: { name: { renderer: 'text' } },
        load: actions.detail,
        submit: (input: z.output<typeof createSchema>) => actions.update(id, input),
      }),
      afterSubmit: async ({ result, navigate }) => {
        completions.push(result)
        await navigate('/complete')
      },
    },
    delete: {
      permission: null,
      run: actions.delete,
    },
  })
  return {
    app,
    fetchMock,
    requests,
    completions,
    setFetchHandler: (handler: typeof intercept) => {
      intercept = handler
    },
    list: resource.list,
    create: resource.create,
    update: resource.update({ id: '1' }),
  }
}

async function flush(times = 10) {
  for (let attempt = 0; attempt < times; attempt += 1) {
    await Promise.resolve()
    await nextTick()
  }
}

type FormViewHandle = { submit: () => Promise<void> | undefined; refresh: () => Promise<void> | undefined }

function isFormViewHandle(value: unknown): value is FormViewHandle {
  return typeof value === 'object' && value !== null && 'submit' in value && typeof value.submit === 'function' && 'refresh' in value && typeof value.refresh === 'function'
}

function mountPage(resource: ReturnType<typeof createApi>, options: { operation?: 'create' | 'update'; slotSubmit?: boolean } = {}) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const route = options.operation === 'update' ? resource.update : resource.create
  const submissions: { result: unknown; refreshError: unknown }[] = []
  const errors: unknown[] = []
  let formView: FormViewHandle | undefined
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/complete', name: 'complete', component: defineComponent(() => () => h('div')) },
      { path: '/:pathMatch(.*)*', component: defineComponent(() => () => h('div')) },
    ],
  })
  const app = createApp(
    defineComponent(
      () => () =>
        h('main', [
          h(ListView as Component, { ...resource.list, title: 'Records' }),
          h(
            FormView as Component,
            {
              ...route,
              title: options.operation === 'update' ? 'Edit record' : 'Create record',
              ref: (value: unknown) => {
                formView = isFormViewHandle(value) ? value : undefined
              },
              onSubmitted: (result, refreshError) => submissions.push({ result, refreshError }),
              onError: (error) => errors.push(error),
            },
            options.slotSubmit
              ? {
                  actions: (scope: { submit: () => Promise<void>; refresh: () => Promise<void> }) =>
                    h('div', [
                      h(
                        'button',
                        {
                          type: 'button',
                          'data-slot-submit': '',
                          onClick: () => {
                            void scope.submit()
                          },
                        },
                        'Save from slot'
                      ),
                      h(
                        'button',
                        {
                          type: 'button',
                          'data-slot-refresh': '',
                          onClick: () => {
                            void scope.refresh()
                          },
                        },
                        'Retry from slot'
                      ),
                    ]),
                }
              : undefined
          ),
        ])
    )
  )
  app.use(router)
  const queryClient = createFrameworkQueryClient({ retry: 0, staleTime: 0 })
  app.use(FrameworkPlugin, {
    adapters: { data: dataAdapter },
    queryClient,
  })
  app.mount(host)
  let active = true
  const unmount = () => {
    if (!active) return
    active = false
    app.unmount()
    host.remove()
    queryClient.clear()
    resetResourceRuntimeForTests()
  }
  mountedPages.add(unmount)
  return {
    host,
    submissions,
    errors,
    router,
    submitExposed: () => formView?.submit(),
    refreshExposed: () => formView?.refresh(),
    unmount,
  }
}

function mountListSurfaces(resource: ReturnType<typeof createApi>, namespaces: { value: string[] }) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:pathMatch(.*)*', component: defineComponent(() => () => h('div')) }],
  })
  const app = createApp(
    defineComponent(
      () => () =>
        h(
          'main',
          namespaces.value.map((namespace) => h(ListView as Component, { ...resource.list, table: { ...resource.list.table, namespace } }))
        )
    )
  )
  app.use(router)
  const queryClient = createFrameworkQueryClient({ retry: 0, staleTime: 0 })
  app.use(FrameworkPlugin, {
    adapters: { data: dataAdapter },
    queryClient,
  })
  app.mount(host)
  let active = true
  const unmount = () => {
    if (!active) return
    active = false
    app.unmount()
    host.remove()
    queryClient.clear()
    resetResourceRuntimeForTests()
  }
  mountedPages.add(unmount)
  return {
    host,
    unmount,
  }
}

const mountedPages = new Set<() => void>()

afterEach(() => {
  for (const unmount of mountedPages) unmount()
  mountedPages.clear()
  vi.restoreAllMocks()
  resetResourceRuntimeForTests()
})

describe('resource completion through Hono HTTP', () => {
  it('reports and recovers a saved create when its active collection read fails', async () => {
    const resource = createApi()
    const toastWarning = vi.spyOn(toast, 'warning').mockImplementation(() => '')
    const toastSuccess = vi.spyOn(toast, 'success').mockImplementation(() => '')
    const toastError = vi.spyOn(toast, 'error').mockImplementation(() => '')
    let listReads = 0
    resource.setFetchHandler((request) => {
      const url = new URL(request.url)
      if (request.method === 'GET' && url.pathname === '/records/list' && listReads++ === 1) {
        return new Response(JSON.stringify({ message: 'The list is unavailable.' }), { status: 503, headers: { 'content-type': 'application/json' } })
      }
    })
    const page = mountPage(resource)
    await vi.waitFor(() => expect(page.host.querySelector<HTMLInputElement>('input[id$="-field-name"]')?.value).toBe('Created'))

    page.host.querySelector<HTMLButtonElement>('form button[type="submit"]')?.click()
    await vi.waitFor(() => {
      expect(page.submissions).toHaveLength(1)
      expect(page.host.textContent).toContain('Changes saved. The data could not be refreshed.')
    })

    expect(resource.requests.filter((request) => request.method === 'POST')).toHaveLength(1)
    expect(resource.requests.filter((request) => request.method === 'GET')).toHaveLength(2)
    expect(page.submissions).toHaveLength(1)
    expect(page.submissions[0]?.result).toEqual({ id: '2', name: 'Created' })
    expect(page.submissions[0]?.refreshError).toMatchObject({ writeOutcome: 'confirmed' })
    expect(page.errors).toHaveLength(0)
    expect(resource.completions).toEqual([{ id: '2', name: 'Created' }])
    expect(page.router.currentRoute.value.path).toBe('/complete')
    expect(toastWarning).toHaveBeenCalledOnce()
    expect(toastWarning).toHaveBeenCalledWith('Changes saved. Could not refresh the data.')
    expect(toastError).not.toHaveBeenCalled()
    expect(toastSuccess).not.toHaveBeenCalledWith('Changes saved.')
    expect(page.host.textContent).toContain('Changes saved. The data could not be refreshed.')

    const retry = [...page.host.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent?.trim() === 'Retry refresh')
    retry?.click()
    await vi.waitFor(() => {
      expect(resource.requests.filter((request) => request.method === 'GET')).toHaveLength(3)
      expect(page.host.textContent).not.toContain('Changes saved. The data could not be refreshed.')
    })

    expect(resource.requests.filter((request) => request.method === 'POST')).toHaveLength(1)
    expect(resource.requests.filter((request) => request.method === 'GET')).toHaveLength(3)
    expect(page.submissions).toHaveLength(1)
    expect(resource.completions).toEqual([{ id: '2', name: 'Created' }])
    expect(toastWarning).toHaveBeenCalledOnce()
    expect(page.router.currentRoute.value.path).toBe('/complete')
    page.unmount()
  })

  it('reports a saved update when PATCH is followed by a failed active collection read', async () => {
    const resource = createApi()
    const toastWarning = vi.spyOn(toast, 'warning').mockImplementation(() => '')
    const toastError = vi.spyOn(toast, 'error').mockImplementation(() => '')
    let listReads = 0
    resource.setFetchHandler((request) => {
      const url = new URL(request.url)
      if (request.method === 'GET' && url.pathname === '/records/list' && listReads++ === 1) {
        return new Response(JSON.stringify({ message: 'The list is unavailable.' }), { status: 503, headers: { 'content-type': 'application/json' } })
      }
    })
    const page = mountPage(resource, { operation: 'update', slotSubmit: true })
    await vi.waitFor(() => expect(page.host.querySelector<HTMLInputElement>('input[id$="-field-name"]')?.value).toBe('Current'))
    const input = page.host.querySelector<HTMLInputElement>('input[id$="-field-name"]')
    if (!input) throw new Error('Update form name input did not render.')
    input.value = 'Changed'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    await vi.waitFor(() => expect(input.value).toBe('Changed'))

    page.host.querySelector<HTMLButtonElement>('[data-slot-submit]')?.click()
    await vi.waitFor(() => {
      expect(page.submissions).toHaveLength(1)
      expect(page.host.textContent).toContain('Changes saved. The data could not be refreshed.')
    })

    expect(resource.requests.filter((request) => request.method === 'PATCH')).toHaveLength(1)
    expect(resource.requests.filter((request) => request.method === 'GET' && new URL(`https://api.test${request.path}`).pathname === '/records/list')).toHaveLength(2)
    expect(page.submissions).toHaveLength(1)
    expect(page.submissions[0]?.result).toEqual({ id: '1', name: 'Changed' })
    expect(page.submissions[0]?.refreshError).toMatchObject({ writeOutcome: 'confirmed' })
    expect(page.errors).toHaveLength(0)
    expect(resource.completions).toEqual([{ id: '1', name: 'Changed' }])
    expect(page.router.currentRoute.value.path).toBe('/complete')
    expect(toastWarning).toHaveBeenCalledOnce()
    expect(toastError).not.toHaveBeenCalled()

    page.host.querySelector<HTMLButtonElement>('[data-slot-refresh]')?.click()
    await vi.waitFor(() => {
      expect(resource.requests.filter((request) => request.method === 'GET' && request.path === '/records/list')).toHaveLength(3)
      expect(page.host.textContent).not.toContain('Changes saved. The data could not be refreshed.')
    })

    expect(resource.requests.filter((request) => request.method === 'PATCH')).toHaveLength(1)
    expect(page.submissions).toHaveLength(1)
    expect(resource.completions).toEqual([{ id: '1', name: 'Changed' }])
    expect(toastWarning).toHaveBeenCalledOnce()
    page.unmount()
  })

  it('closes a confirmed delete, blocks its identity, and recovers with reads only', async () => {
    const resource = createApi()
    const toastWarning = vi.spyOn(toast, 'warning').mockImplementation(() => '')
    const toastError = vi.spyOn(toast, 'error').mockImplementation(() => '')
    let listReads = 0
    resource.setFetchHandler((request) => {
      const url = new URL(request.url)
      if (request.method === 'GET' && url.pathname === '/records/list' && listReads++ === 1) {
        return new Response(JSON.stringify({ message: 'The list is unavailable.' }), { status: 503, headers: { 'content-type': 'application/json' } })
      }
    })
    const page = mountPage(resource)
    const rowDeleteButton = (name: string) =>
      [...page.host.querySelectorAll<HTMLTableRowElement>('tbody tr')].find((row) => row.textContent?.includes(name))?.querySelector<HTMLButtonElement>('button[aria-label="Delete"]')
    const dialog = () => document.body.querySelector<HTMLElement>('[role="dialog"]')
    const dialogButton = (label: string) => [...(dialog()?.querySelectorAll<HTMLButtonElement>('button') ?? [])].find((button) => button.textContent?.trim() === label)
    await vi.waitFor(() => expect(page.host.textContent).toContain('Current'))

    rowDeleteButton('Current')?.click()
    await vi.waitFor(() => expect(dialog()).not.toBeNull())
    dialogButton('Delete')?.click()
    await vi.waitFor(() => {
      expect(toastWarning).toHaveBeenCalledOnce()
      expect(page.host.textContent).toContain('Changes saved. The record list could not be refreshed.')
      expect(dialog()).toBeNull()
    })

    expect(resource.requests.filter((request) => request.method === 'DELETE')).toEqual([{ method: 'DELETE', path: '/records/delete/1' }])
    expect(dialog()).toBeNull()
    expect(page.host.textContent).toContain('Current')
    expect(toastWarning).toHaveBeenCalledOnce()
    expect(toastError).not.toHaveBeenCalled()

    rowDeleteButton('Current')?.click()
    await vi.waitFor(() => expect(dialogButton('Delete')?.disabled).toBe(true))
    dialogButton('Cancel')?.click()
    await vi.waitFor(() => expect(dialog()).toBeNull())
    rowDeleteButton('Another')?.click()
    await vi.waitFor(() => expect(dialog()).not.toBeNull())
    dialogButton('Delete')?.click()
    await vi.waitFor(() => expect(resource.requests.filter((request) => request.method === 'DELETE')).toHaveLength(2))
    await vi.waitFor(() => expect(dialog()).toBeNull())
    expect(resource.requests.filter((request) => request.method === 'DELETE')).toEqual([
      { method: 'DELETE', path: '/records/delete/1' },
      { method: 'DELETE', path: '/records/delete/3' },
    ])

    const retry = [...page.host.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent?.trim() === 'Retry refresh')
    const beforeRecovery = resource.requests.length
    retry?.click()
    await vi.waitFor(() => {
      expect(resource.requests.length).toBe(beforeRecovery + 1)
      expect(page.host.textContent).not.toContain('Changes saved. The record list could not be refreshed.')
    })

    expect(resource.requests.length).toBe(beforeRecovery + 1)
    expect(resource.requests.at(-1)).toEqual({ method: 'GET', path: '/records/list' })
    expect(resource.requests.filter((request) => request.method === 'DELETE')).toHaveLength(2)
    expect(toastWarning).toHaveBeenCalledOnce()
    page.unmount()
  })

  it('notifies once when two mounted ListViews share a failed HTTP read', async () => {
    const resource = createApi()
    const toastError = vi.spyOn(toast, 'error').mockImplementation(() => '')
    resource.setFetchHandler((request) =>
      request.method === 'GET' ? new Response(JSON.stringify({ message: 'The list is unavailable.' }), { status: 503, headers: { 'content-type': 'application/json' } }) : undefined
    )
    const page = mountListSurfaces(resource, { value: ['records.list', 'records.list'] })
    await vi.waitFor(() => expect(page.host.querySelectorAll('[role="alert"]')).toHaveLength(2))

    expect(resource.requests).toEqual([{ method: 'GET', path: '/records/list' }])
    expect(page.host.querySelectorAll('[role="alert"]')).toHaveLength(2)
    expect(page.host.textContent?.match(/The list is unavailable\./g)).toHaveLength(2)
    expect(toastError).toHaveBeenCalledOnce()
    expect(toastError).toHaveBeenCalledWith('The list is unavailable.')
    page.unmount()
  })

  it('ignores a late failed response after a ListView query identity changes', async () => {
    const resource = createApi()
    const toastError = vi.spyOn(toast, 'error').mockImplementation(() => '')
    let firstRequest: Request | undefined
    let rejectFirst: ((error: unknown) => void) | undefined
    const firstResponse = new Promise<Response>((_resolve, reject) => {
      rejectFirst = reject
    })
    resource.setFetchHandler((request) => {
      if (request.method !== 'GET') return undefined
      if (!firstRequest) {
        firstRequest = request
        return firstResponse
      }
      return undefined
    })
    const namespaces = ref(['old-query'])
    const page = mountListSurfaces(resource, namespaces)
    await vi.waitFor(() => expect(firstRequest).toBeDefined())

    namespaces.value = ['new-query']
    await vi.waitFor(() => expect(resource.requests.filter((request) => request.method === 'GET')).toHaveLength(2))
    await vi.waitFor(() => expect(page.host.textContent).toContain('Current'))
    expect(firstRequest?.signal.aborted).toBe(true)
    expect(page.host.textContent).toContain('Current')

    rejectFirst?.(new Error('The old query failed late.'))
    await flush(3)

    expect(page.host.textContent).toContain('Current')
    expect(page.host.textContent).not.toContain('old query failed late')
    expect(toastError).not.toHaveBeenCalled()
    page.unmount()
  })

  it('keeps a definite rejected write editable and permits a deliberate corrected submit', async () => {
    const resource = createApi()
    resource.setFetchHandler((request) =>
      request.method === 'POST'
        ? new Response(JSON.stringify({ message: 'Name is required.', errors: { name: ['Required.'] } }), { status: 422, headers: { 'content-type': 'application/json' } })
        : undefined
    )
    const page = mountPage(resource)
    const input = page.host.querySelector<HTMLInputElement>('input[id$="-field-name"]')
    await vi.waitFor(() => expect(input?.value).toBe('Created'))
    if (!input) throw new Error('Create form name input did not render.')
    const form = page.host.querySelector<HTMLFormElement>('form')
    if (!form) throw new Error('Create form did not render.')

    page.host.querySelector<HTMLButtonElement>('form button[type="submit"]')?.click()
    await vi.waitFor(() => {
      expect(resource.requests.filter((request) => request.method === 'POST')).toHaveLength(1)
      expect(page.errors).toHaveLength(1)
      expect(page.host.textContent).toContain('Required.')
    })
    expect(page.submissions).toHaveLength(0)
    expect(page.errors).toHaveLength(1)
    expect(page.errors[0]).not.toHaveProperty('postWrite')
    expect(page.errors[0]).not.toHaveProperty('writeOutcome')
    expect(input.value).toBe('Created')
    expect(page.host.textContent).toContain('Required.')

    input.value = 'Corrected'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    await vi.waitFor(() => expect(input.value).toBe('Corrected'))
    resource.setFetchHandler(() => undefined)
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await vi.waitFor(() => expect(page.submissions).toHaveLength(1))

    expect(resource.requests.filter((request) => request.method === 'POST')).toHaveLength(2)
    expect(page.submissions).toHaveLength(1)
    expect(page.submissions[0]?.result).toEqual({ id: '2', name: 'Corrected' })
    expect(resource.completions).toEqual([{ id: '2', name: 'Corrected' }])
    page.unmount()
  })

  it('keeps a dispatched write block after the response is lost and ordinary refresh runs', async () => {
    const resource = createApi()
    const toastError = vi.spyOn(toast, 'error').mockImplementation(() => '')
    resource.setFetchHandler((request) => {
      if (request.method === 'POST') throw new Error('The connection closed.')
    })
    const page = mountPage(resource, { slotSubmit: true })
    await vi.waitFor(() => expect(page.host.querySelector<HTMLInputElement>('input[id$="-field-name"]')?.value).toBe('Created'))
    const form = page.host.querySelector<HTMLFormElement>('form')
    if (!form) throw new Error('Create form did not render.')

    page.host.querySelector<HTMLButtonElement>('[data-slot-submit]')?.click()
    await vi.waitFor(() => {
      expect(page.errors).toHaveLength(1)
      expect(page.host.textContent).toContain('The save may have completed. Check the record before starting another save.')
    })
    expect(resource.requests.filter((request) => request.method === 'POST')).toHaveLength(1)
    expect(page.submissions).toHaveLength(0)
    expect(page.errors).toHaveLength(1)
    expect(page.errors[0]).toMatchObject({ postWrite: true, retryable: false, writeOutcome: 'uncertain' })
    expect(page.host.textContent).toContain('The save may have completed. Check the record before starting another save.')
    expect(toastError).toHaveBeenCalledOnce()

    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await page.submitExposed()
    page.host.querySelector<HTMLButtonElement>('[data-slot-submit]')?.click()
    await page.refreshExposed()

    expect(resource.requests.filter((request) => request.method === 'POST')).toHaveLength(1)
    expect(page.submissions).toHaveLength(0)
    expect(page.errors).toHaveLength(1)
    expect(resource.completions).toHaveLength(0)
    expect(page.host.textContent).toContain('The save may have completed. Check the record before starting another save.')
    page.unmount()
  })
})
