import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { FrameworkPlugin, createFrameworkQueryClient, resetResourceRuntimeForTests, resolveFrameworkAdapters } from '@southneuhof/loom'
import { createRouteQueryAdapter } from '@/framework/adapters/query/routeQuery'
import { appDisplayRenderers } from '@/framework/display/renderers'

const mocks = vi.hoisted(() => ({
  load: vi.fn(),
  set: vi.fn(),
  can: vi.fn(),
  toastError: vi.fn(),
  rows: [] as any[],
}))

vi.mock('./role-assignments.actions', () => ({
  roleAssignmentsActions: {
    list: ({ searchParameters }: { searchParameters: Record<string, unknown> }) => mocks.load(String(searchParameters.userId ?? ''), searchParameters),
    set: mocks.set,
  },
}))
vi.mock('@/stores/permissions', () => ({ permissions: () => ({ can: mocks.can }) }))
vi.mock('vue-sonner', () => ({ toast: { error: mocks.toastError } }))

const Route = (await import('./index.route.vue')).default

const baseRows = [
  { id: 'r1', roleCode: 'admin', name: 'Admin', description: 'Manage accounts', active: true, assigned: true },
  { id: 'r4', roleCode: 'available', name: 'Available', description: null, active: true, assigned: false },
]

let cleanupMountedRoute: (() => void) | undefined

async function mountRoute(path = '/settings/users/u1/detail/role-assignments') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/settings/users/:userId/detail/role-assignments', name: 'settings-users-detail-role-assignments', component: Route }],
  })
  await router.push(path)
  await router.isReady()
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent(() => () => h(Route)))
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
  cleanupMountedRoute = unmount
  app.use(router)
  app.use(FrameworkPlugin, {
    adapters: resolveFrameworkAdapters({ query: createRouteQueryAdapter(router) }),
    renderers: { display: appDisplayRenderers },
    queryClient,
  })
  app.directive('tippy', {})
  app.mount(host)
  mounted = true
  await vi.waitFor(() => expect(host.querySelectorAll('button[role="switch"][data-role]')).toHaveLength(baseRows.length))

  return {
    host,
    router,
    switchButton: (id: string) => {
      const button = host.querySelector<HTMLButtonElement>(`button[role="switch"][data-role="${id}"]`)
      if (!button) throw new Error(`The role switch for ${id} is missing.`)
      return button
    },
    unmount,
  }
}

beforeEach(() => {
  mocks.load.mockReset()
  mocks.set.mockReset()
  mocks.can.mockReset()
  mocks.toastError.mockReset()
  mocks.can.mockReturnValue(true)
  mocks.rows = baseRows.map((row) => ({ ...row }))
  mocks.load.mockImplementation(async (_userId: string, searchParameters: Record<string, unknown>) => ({
    data: mocks.rows.map((row) => ({ ...row })),
    meta: { total: mocks.rows.length },
    searchParameters,
  }))
  mocks.set.mockImplementation(async (_userId: string, roleId: string, assigned: boolean) => {
    const row = mocks.rows.find((item) => item.id === roleId)
    if (row) row.assigned = assigned
    return mocks.rows.map((row) => ({ ...row }))
  })
})

afterEach(() => {
  try {
    cleanupMountedRoute?.()
  } finally {
    cleanupMountedRoute = undefined
    resetResourceRuntimeForTests()
  }
})

describe('role assignment screen', () => {
  it('lists roles and toggles assignment without scope filters', async () => {
    const view = await mountRoute()

    expect(view.host.textContent).toContain('Admin')
    expect(view.host.textContent).toContain('Available')
    expect(mocks.load.mock.calls.at(-1)?.[1]).toMatchObject({ userId: 'u1' })

    const available = view.switchButton('r4')
    expect(available.getAttribute('aria-label')).toBe('Role Available')
    expect(available.getAttribute('aria-checked')).toBe('false')
    expect(available.disabled).toBe(false)
    const assigned = view.switchButton('r1')
    expect(assigned.getAttribute('aria-label')).toBe('Role Admin')
    expect(assigned.getAttribute('aria-checked')).toBe('true')
    expect(assigned.disabled).toBe(false)

    available.click()
    await vi.waitFor(() => {
      expect(mocks.set).toHaveBeenCalledWith('u1', 'r4', true)
      expect(view.switchButton('r4').getAttribute('aria-checked')).toBe('true')
    })

    assigned.click()
    await vi.waitFor(() => {
      expect(mocks.set).toHaveBeenLastCalledWith('u1', 'r1', false)
      expect(assigned.getAttribute('aria-checked')).toBe('false')
    })
    view.unmount()
  })
})
