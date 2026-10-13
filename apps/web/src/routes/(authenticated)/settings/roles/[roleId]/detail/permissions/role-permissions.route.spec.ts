import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { FrameworkPlugin, createFrameworkQueryClient, resetResourceRuntimeForTests } from '@southneuhof/loom'
import { toast } from 'vue-sonner'

const calls: { method: string; permissionId: string }[] = []
const assignmentState: Record<string, boolean> = {}
let failure = false
let deferPut = false
let resolvePut: (() => void) | undefined

const ok = (payload: unknown) => ({ ok: true, json: async () => payload })
let cleanupMountedScreen: (() => void) | undefined

vi.mock('vue-sonner', () => ({ toast: { error: vi.fn() } }))
vi.mock('@/stores/permissions', () => ({ permissions: () => ({ can: () => true }) }))
vi.mock('@/framework/rpc', () => ({
  rpc: {
    roles: {
      list: { $get: vi.fn(async () => ok({ data: [], total: 0 })) },
      ':roleId': {
        permissions: {
          $get: vi.fn(async () =>
            ok({
              data: [
                {
                  id: 'p1',
                  permissionCode: 'view-users',
                  name: 'View users',
                  description: 'Read users',
                  assigned: assignmentState.p1,
                },
                {
                  id: 'p2',
                  permissionCode: 'manage-users',
                  name: 'Manage users',
                  description: null,
                  assigned: assignmentState.p2,
                },
                {
                  id: 'p3',
                  permissionCode: 'view-roles',
                  name: 'View roles',
                  description: null,
                  assigned: assignmentState.p3,
                },
              ],
              total: 3,
            })
          ),
          ':permissionId': {
            $put: vi.fn(async ({ param }: { param: { permissionId: string } }) => {
              calls.push({ method: 'put', permissionId: param.permissionId })
              if (deferPut)
                await new Promise<void>((resolve) => {
                  resolvePut = resolve
                })
              if (failure) return { ok: false, json: async () => ({ message: 'Denied' }) }
              assignmentState[param.permissionId] = true
              return ok({
                data: {
                  id: param.permissionId,
                  permissionCode: 'view-users',
                  name: 'View users',
                  description: null,
                  assigned: true,
                },
              })
            }),
            $delete: vi.fn(async ({ param }: { param: { permissionId: string } }) => {
              calls.push({ method: 'delete', permissionId: param.permissionId })
              if (failure) return { ok: false, json: async () => ({ message: 'Denied' }) }
              assignmentState[param.permissionId] = false
              return ok({
                data: {
                  id: param.permissionId,
                  permissionCode: 'manage-users',
                  name: 'Manage users',
                  description: null,
                  assigned: false,
                },
              })
            }),
          },
        },
      },
    },
  },
}))

const Screen = (await import('./index.route.vue')).default

async function mountScreen() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/settings/roles/:roleId/detail/permissions', name: 'settings-roles-detail-permissions', component: Screen }],
  })
  await router.push('/settings/roles/role-1/detail/permissions')
  await router.isReady()
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent(() => () => h(Screen)))
  const queryClient = createFrameworkQueryClient({ retry: 0, staleTime: 0 })
  let mounted = false
  let active = true
  const unmount = () => {
    if (!active) return
    active = false
    try {
      if (mounted) app.unmount()
    } finally {
      host.remove()
      queryClient.clear()
    }
  }
  cleanupMountedScreen = unmount
  app.use(router)
  app.use(FrameworkPlugin, { queryClient })
  app.mount(host)
  mounted = true
  await vi.waitFor(() => expect(host.querySelectorAll('button[role="switch"][data-permission]')).toHaveLength(3))
  return {
    host,
    permissionSwitch: (id: string) => {
      const button = host.querySelector<HTMLButtonElement>(`button[role="switch"][data-permission="${id}"]`)
      if (!button) throw new Error(`The permission switch for ${id} is missing.`)
      return button
    },
    unmount,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  calls.length = 0
  assignmentState.p1 = false
  assignmentState.p2 = true
  assignmentState.p3 = false
  failure = false
  deferPut = false
  resolvePut = undefined
})

afterEach(() => {
  try {
    cleanupMountedScreen?.()
  } finally {
    cleanupMountedScreen = undefined
    resetResourceRuntimeForTests()
  }
})

describe('role permission editor', () => {
  it('shows permissions in one standard list and exposes accessible switches', async () => {
    const view = await mountScreen()
    expect(view.host.querySelectorAll('table')).toHaveLength(1)
    expect(view.host.textContent).toContain('View users')
    expect(view.host.textContent).toContain('Manage users')
    expect(view.host.textContent).toContain('View roles')
    const switches = view.host.querySelectorAll<HTMLButtonElement>('button[role="switch"][data-permission]')
    expect(switches).toHaveLength(3)
    expect(view.permissionSwitch('p1').getAttribute('aria-label')).toBe('Permission View users')
    expect(view.permissionSwitch('p1').getAttribute('aria-checked')).toBe('false')
    expect(view.permissionSwitch('p1').disabled).toBe(false)
    expect(view.permissionSwitch('p2').getAttribute('aria-label')).toBe('Permission Manage users')
    expect(view.permissionSwitch('p2').getAttribute('aria-checked')).toBe('true')
    expect(view.permissionSwitch('p2').disabled).toBe(false)
    expect(view.permissionSwitch('p3').getAttribute('aria-label')).toBe('Permission View roles')
    expect(view.permissionSwitch('p3').getAttribute('aria-checked')).toBe('false')
    expect(view.permissionSwitch('p3').disabled).toBe(false)
    view.unmount()
  })

  it('uses PUT and DELETE and keeps the saved state', async () => {
    const view = await mountScreen()
    const add = view.permissionSwitch('p1')
    add.click()
    await vi.waitFor(() => {
      expect(calls).toEqual([{ method: 'put', permissionId: 'p1' }])
      expect(add.getAttribute('aria-checked')).toBe('true')
    })

    const remove = view.permissionSwitch('p2')
    remove.click()
    await vi.waitFor(() => {
      expect(calls).toEqual([
        { method: 'put', permissionId: 'p1' },
        { method: 'delete', permissionId: 'p2' },
      ])
      expect(remove.getAttribute('aria-checked')).toBe('false')
    })
    view.unmount()
  })

  it('shows the new state and disables the switch while the request is pending', async () => {
    deferPut = true
    const view = await mountScreen()
    const add = view.permissionSwitch('p1')
    add.click()
    await vi.waitFor(() => {
      expect(add.getAttribute('aria-checked')).toBe('true')
      expect(add.disabled).toBe(true)
      expect(view.permissionSwitch('p2').disabled).toBe(false)
    })

    const release = resolvePut
    if (!release) throw new Error('The pending permission request has no release function.')
    release()
    await vi.waitFor(() => {
      expect(add.getAttribute('aria-checked')).toBe('true')
      expect(add.disabled).toBe(false)
    })
    view.unmount()
  })

  it('keeps the previous state and shows an error when a toggle fails', async () => {
    failure = true
    const view = await mountScreen()
    const add = view.permissionSwitch('p1')
    add.click()
    await vi.waitFor(() => {
      expect(add.getAttribute('aria-checked')).toBe('false')
      expect(add.disabled).toBe(false)
      expect(vi.mocked(toast.error)).toHaveBeenCalledWith('Denied')
    })
    view.unmount()
  })

  it('restores the previous state when a pending toggle fails', async () => {
    deferPut = true
    failure = true
    const view = await mountScreen()
    const add = view.permissionSwitch('p1')
    add.click()
    await vi.waitFor(() => {
      expect(add.getAttribute('aria-checked')).toBe('true')
      expect(add.disabled).toBe(true)
    })
    const release = resolvePut
    if (!release) throw new Error('The pending permission request has no release function.')
    release()
    await vi.waitFor(() => {
      expect(add.getAttribute('aria-checked')).toBe('false')
      expect(add.disabled).toBe(false)
      expect(vi.mocked(toast.error)).toHaveBeenCalledWith('Denied')
    })
    view.unmount()
  })

  it('shows pagination under the role detail', async () => {
    const view = await mountScreen()
    expect(view.host.querySelector('nav[aria-label="Pagination"]')).not.toBeNull()
    expect(view.host.textContent).toContain('Showing data 1–3 out of 3')
    view.unmount()
  })

  it('does not send duplicate requests while a row is pending', async () => {
    const view = await mountScreen()
    deferPut = true
    const button = view.permissionSwitch('p1')
    button.click()
    button.click()
    await vi.waitFor(() => {
      expect(button.disabled).toBe(true)
      expect(calls).toHaveLength(1)
    })
    const release = resolvePut
    if (!release) throw new Error('The pending permission request has no release function.')
    release()
    await vi.waitFor(() => {
      expect(button.disabled).toBe(false)
      expect(button.getAttribute('aria-checked')).toBe('true')
    })
    expect(calls).toHaveLength(1)
    view.unmount()
  })
})
