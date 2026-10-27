import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h, nextTick, onMounted, onUnmounted } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'
import AppRouterView from './AppRouterView.vue'
import { keyManager } from '@/stores/keyManager'

type Counter = { mounts: number; unmounts: number }
type Counters = Record<string, Counter>

const mounted: (() => void)[] = []

afterEach(() => {
  mounted.splice(0).forEach((unmount) => unmount())
  vi.useRealTimers()
})

function tracked(name: string, counters: Counters, childOutlet = false, outletDefault?: string) {
  return defineComponent({
    name,
    setup() {
      const counter = (counters[name] ??= { mounts: 0, unmounts: 0 })
      onMounted(() => counter.mounts++)
      onUnmounted(() => counter.unmounts++)
      return () =>
        h('section', { 'data-route': name }, [
          name,
          childOutlet ? h(AppRouterView, null, outletDefault ? { default: () => h('article', { 'data-route-default': outletDefault }, outletDefault) } : undefined) : null,
        ])
    },
  })
}

async function settle() {
  await nextTick()
  await vi.runAllTimersAsync()
  await nextTick()
}

async function mountRoutes(initialPath: string) {
  vi.useFakeTimers()
  const counters: Counters = {}
  const Shell = tracked('shell', counters, true)
  const List = tracked('list', counters)
  const Detail = tracked('detail', counters, true)
  const Permissions = tracked('permissions', counters, true)
  const Edit = tracked('edit', counters)
  const Deep = tracked('deep', counters)
  const Grouped = tracked('grouped', counters)
  const TestSet = tracked('test-set', counters, true, 'case-list')
  const CreateCase = tracked('create-case', counters)
  const EditCase = tracked('edit-case', counters)
  const loadingStarted = vi.fn()
  let releaseLoading: (() => void) | undefined
  const LoadingCase = defineComponent({
    setup() {
      loadingStarted()
      return new Promise<() => ReturnType<typeof h>>((resolve) => {
        releaseLoading = () => resolve(() => h('form', { 'data-route': 'loading-case' }, 'loading-case'))
      })
    },
  })
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/',
        name: 'shell',
        component: Shell,
        children: [
          { path: 'roles', name: 'roles-list', component: List },
          {
            path: 'roles/:roleId',
            name: 'roles-detail',
            component: Detail,
            children: [
              {
                path: 'permissions',
                name: 'roles-permissions',
                component: Permissions,
                children: [{ path: 'deep/:memberId', name: 'roles-permissions-deep', component: Deep }],
              },
              { path: 'edit', name: 'roles-update', component: Edit },
              {
                path: 'group',
                children: [{ path: 'deep', name: 'roles-grouped', component: Grouped }],
              },
              { path: 'permissions/:permissionId/detail/inspect', name: 'roles-permission-inspect', component: Grouped },
            ],
          },
          { path: 'roles/:roleId/permissions/:permissionId/detail', name: 'permission-detail', component: Deep },
          {
            path: 'users/:userId/detail',
            component: Detail,
            children: [{ path: '', name: 'user-default', component: List }],
          },
          {
            path: 'test-sets/:setId',
            name: 'test-set-detail',
            component: TestSet,
            children: [
              { path: 'cases/create', name: 'test-set-case-create', component: CreateCase },
              { path: 'cases/:caseId/edit', name: 'test-set-case-edit', component: EditCase },
              { path: 'cases/:caseId/loading', name: 'test-set-case-loading', component: LoadingCase },
            ],
          },
        ],
      },
    ],
  })
  const pinia = createPinia()
  setActivePinia(pinia)
  keyManager().destroyAll()
  await router.push(initialPath)
  await router.isReady()
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent(() => () => h(RouterView)))
  app.component(
    'Transition',
    defineComponent({
      setup(_, { slots }) {
        return () => slots.default?.()
      },
    })
  )
  app.use(pinia)
  app.use(router)
  app.mount(host)
  await settle()
  mounted.push(() => {
    releaseLoading?.()
    app.unmount()
    host.remove()
  })
  return { counters, host, loadingStarted, releaseLoading: () => releaseLoading?.(), router }
}

describe('AppRouterView', () => {
  it('keeps parent outlet mounted while child routes change', async () => {
    const { counters, router } = await mountRoutes('/roles/7')
    await router.push('/roles/7/permissions')
    await settle()
    expect(counters.shell.mounts).toBe(1)
    expect(counters.detail.mounts).toBe(1)
    expect(counters.permissions.mounts).toBe(1)

    await router.push('/roles/7/edit')
    await settle()
    expect(counters.shell.mounts).toBe(1)
    expect(counters.detail.mounts).toBe(1)
    expect(counters.permissions.unmounts).toBe(1)
    expect(counters.edit.mounts).toBe(1)
  })

  it('remounts rendered record for its own param change', async () => {
    const { counters, router } = await mountRoutes('/roles/7/permissions')
    await router.push('/roles/8/permissions')
    await settle()
    expect(counters.shell.mounts).toBe(1)
    expect(counters.detail.mounts).toBe(2)
    expect(counters.permissions.mounts).toBe(2)
  })

  it('does not remount records for query/hash-only changes', async () => {
    const { counters, router } = await mountRoutes('/roles/7/permissions?filter=open#top')
    await router.push('/roles/7/permissions?filter=closed#bottom')
    await settle()
    expect(counters.shell.mounts).toBe(1)
    expect(counters.detail.mounts).toBe(1)
    expect(counters.permissions.mounts).toBe(1)
  })

  it('remounts an unnamed parent when its identity changes', async () => {
    const { counters, router } = await mountRoutes('/users/7/detail')
    await router.push({ name: 'user-default', params: { userId: '8' } } as never)
    await settle()
    expect(counters.detail.mounts).toBe(2)
    expect(counters.list.mounts).toBe(2)
  })

  it('keeps ancestors mounted when third rendered outlet changes', async () => {
    const { counters, router } = await mountRoutes('/roles/7/permissions')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    await router.push('/roles/7/permissions/deep/9')
    await settle()
    expect(counters.shell.mounts).toBe(1)
    expect(counters.detail.mounts).toBe(1)
    expect(counters.permissions.mounts).toBe(1)
    expect(counters.deep.mounts).toBe(1)
    expect(warn.mock.calls.flat().join(' ')).not.toContain('Discarded invalid param')
    warn.mockRestore()
  })

  it('skips componentless matched records at outlet depth', async () => {
    const { counters, host } = await mountRoutes('/roles/7/group/deep')
    expect(counters.detail.mounts).toBe(1)
    expect(counters.grouped.mounts).toBe(1)
    expect(host.querySelector('[data-route="grouped"]')).not.toBeNull()
  })

  it('remounts route pages when rendered records change', async () => {
    const { counters, router } = await mountRoutes('/roles')
    await router.push('/roles/7/permissions')
    await settle()
    expect(counters.shell.mounts).toBe(1)
    expect(counters.list.unmounts).toBe(1)
    expect(counters.detail.mounts).toBe(1)
    expect(counters.permissions.mounts).toBe(1)
  })

  it('replaces the detail parent for a flat destination', async () => {
    const { counters, host, router } = await mountRoutes('/roles/7/permissions')
    await router.push('/roles/7/permissions/9/detail')
    await settle()
    expect(counters.detail.unmounts).toBe(1)
    expect(counters.permissions.unmounts).toBe(1)
    expect(counters.shell.mounts).toBe(1)
    expect(host.querySelector('[data-route="deep"]')).not.toBeNull()
  })

  it('keeps the higher parent for an intermediate flat destination', async () => {
    const { counters, host, router } = await mountRoutes('/roles/7/permissions')
    await router.push('/roles/7/permissions/9/detail/inspect')
    await settle()
    expect(counters.detail.mounts).toBe(1)
    expect(counters.permissions.unmounts).toBe(1)
    expect(host.querySelector('[data-route="grouped"]')).not.toBeNull()
  })

  it('refreshes only outlet whose record key changed', async () => {
    const { counters } = await mountRoutes('/roles/7/permissions')
    keyManager().triggerChange('roles-permissions')
    await settle()
    expect(counters.detail.mounts).toBe(1)
    expect(counters.permissions.mounts).toBe(2)

    keyManager().triggerChange('roles-detail')
    await settle()
    expect(counters.detail.mounts).toBe(2)
    expect(counters.permissions.mounts).toBe(3)
  })

  it('does not throw before any record matches', () => {
    const router = createRouter({ history: createMemoryHistory(), routes: [] })
    const pinia = createPinia()
    const host = document.createElement('div')
    document.body.appendChild(host)
    const app = createApp(AppRouterView)
    app.use(pinia)
    app.use(router)
    expect(() => app.mount(host)).not.toThrow()
    mounted.push(() => {
      app.unmount()
      host.remove()
    })
  })

  it('shows the parent default only without a child and restores it on browser Back', async () => {
    const { host, router } = await mountRoutes('/test-sets/7')
    expect(host.querySelector('[data-route-default="case-list"]')).not.toBeNull()

    await router.push('/test-sets/7/cases/create')
    await settle()
    expect(host.querySelector('[data-route="create-case"]')).not.toBeNull()
    expect(host.querySelector('[data-route-default="case-list"]')).toBeNull()

    await router.push('/test-sets/7/cases/3/edit')
    await settle()
    expect(host.querySelector('[data-route="edit-case"]')).not.toBeNull()
    expect(host.querySelector('[data-route-default="case-list"]')).toBeNull()

    router.back()
    await settle()
    expect(host.querySelector('[data-route="create-case"]')).not.toBeNull()
    expect(host.querySelector('[data-route-default="case-list"]')).toBeNull()

    router.back()
    await settle()
    expect(host.querySelector('[data-route="test-set"]')).not.toBeNull()
    expect(host.querySelector('[data-route-default="case-list"]')).not.toBeNull()
  })

  it('keeps the parent default hidden on direct child entry', async () => {
    const { host } = await mountRoutes('/test-sets/7/cases/3/edit')
    expect(host.querySelector('[data-route="edit-case"]')).not.toBeNull()
    expect(host.querySelector('[data-route-default="case-list"]')).toBeNull()
  })

  it('keeps the parent default hidden while a matched child is loading', async () => {
    const { host, loadingStarted, releaseLoading, router } = await mountRoutes('/test-sets/7')
    await router.push('/test-sets/7/cases/3/loading')
    await settle()

    expect(loadingStarted).toHaveBeenCalledTimes(1)
    expect(host.querySelector('svg.spinner')).not.toBeNull()
    expect(host.querySelector('[data-route-default="case-list"]')).toBeNull()
    expect(host.querySelector('[data-route="loading-case"]')).toBeNull()

    releaseLoading()
    await settle()
    expect(host.querySelector('[data-route-default="case-list"]')).toBeNull()
    expect(host.querySelector('[data-route="loading-case"]')).not.toBeNull()
  })
})
