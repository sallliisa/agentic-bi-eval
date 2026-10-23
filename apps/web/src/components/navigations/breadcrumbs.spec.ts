import { describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter, type RouteRecordRaw } from 'vue-router'
import { routeBreadcrumbs } from './breadcrumbs'
import type { VisibleNavigationModule } from '@/manifest'

const Page = { template: '<div />' }
const routes: RouteRecordRaw[] = [
  { path: '/dashboard', name: 'dashboard', component: Page },
  { path: '/settings/users', name: 'settings-users', component: Page },
  { path: '/settings/users/:userId/detail/role-assignments', name: 'settings-users-detail-role-assignments', component: Page },
  { path: '/unlisted-page', name: 'unlisted-page', component: Page },
]
const navigation: VisibleNavigationModule[] = [
  {
    kind: 'standalone',
    name: 'dashboard',
    title: 'Dashboard',
    icon: 'home',
    description: 'Dashboard',
    routes: [{ name: 'dashboard', title: 'Dashboard', icon: 'home', to: { name: 'dashboard' } }],
  },
  {
    kind: 'module',
    name: 'settings',
    title: 'Settings',
    icon: 'settings',
    description: 'Settings',
    routes: [{ name: 'settings-users', title: 'Users', icon: 'folder', to: { name: 'settings-users' } }],
  },
]

async function breadcrumbs(path: string) {
  const router = createRouter({ history: createMemoryHistory(), routes })
  await router.push(path)
  return routeBreadcrumbs(router.currentRoute.value, router, navigation)
}

describe('routeBreadcrumbs', () => {
  it('uses a single current item for a navigation entrypoint', async () => {
    expect(await breadcrumbs('/dashboard')).toEqual([{ label: 'Dashboard' }])
  })

  it('builds full hierarchy without exposing dynamic record ids', async () => {
    expect(await breadcrumbs('/settings/users/42/detail/role-assignments')).toEqual([
      { label: 'Settings' },
      { label: 'Users', to: { name: 'settings-users' } },
      { label: 'Detail' },
      { label: 'Role' },
      { label: 'Assignments' },
    ])
  })

  it('supports stable fallbacks', async () => {
    expect(await breadcrumbs('/unlisted-page')).toEqual([{ label: 'Unlisted Page' }])
  })
})
