import { defineNavigation, type NavigationIcon, type NavigationModule } from './contract'

export const navigation = defineNavigation([
  { kind: 'standalone', name: 'dashboard', title: 'Dashboard', icon: 'home', description: 'Dashboard', routes: [{ to: { name: 'dashboard' }, permission: null, title: 'Dashboard', icon: 'home' }] },
  {
    kind: 'module',
    name: 'test-runner',
    title: 'Test Runner',
    icon: 'folder',
    description: 'Test Runner',
    routes: [
      { to: { name: 'test-runner-test-sets' }, permission: 'view-test-sets', title: 'Test Sets', icon: 'folder' },
      { to: { name: 'test-runner-test-runs' }, permission: 'view-test-runs', title: 'Test Runs', icon: 'folder' },
    ],
  },
  {
    kind: 'standalone',
    name: 'skills-context',
    title: 'Skills and Context',
    icon: 'folder',
    description: 'Skills and Context',
    routes: [{ to: { name: 'skills-context' }, permission: 'view-skills-context', title: 'Skills and Context', icon: 'folder' }],
  },
  {
    kind: 'module',
    name: 'settings',
    title: 'Settings',
    icon: 'settings',
    description: 'Settings',
    routes: [
      { to: { name: 'settings-users' }, permission: 'view-users', title: 'Users', icon: 'folder' },
      { to: { name: 'settings-roles' }, permission: 'view-roles', title: 'Roles', icon: 'folder' },
      { to: { name: 'settings-permissions' }, permission: 'view-permissions', title: 'Permissions', icon: 'folder' },
      { to: { name: 'settings-agent-instructions' }, permission: 'view-agent-instructions', title: 'Agent Instructions', icon: 'folder' },
      { to: { name: 'settings-model-providers' }, permission: 'view-model-providers', title: 'Model Providers', icon: 'folder' },
    ],
  },
] as const satisfies readonly NavigationModule[])

export type VisibleNavigationRoute = { name: string; to: unknown; title: string; icon: NavigationIcon; aliases?: readonly string[] }
export type VisibleNavigationEntry = { separator: true; name: string } | VisibleNavigationRoute
export type VisibleNavigationModule = Omit<(typeof navigation)[number], 'routes'> & { routes: VisibleNavigationEntry[] }

export function visibleNavigation(allows: (permission: string) => boolean): VisibleNavigationModule[] {
  return navigation.flatMap((module) => {
    const routes: VisibleNavigationEntry[] = []
    for (const entry of module.routes) {
      if ('separator' in entry) {
        if (routes.length && !('separator' in routes.at(-1)!)) routes.push({ separator: true, name: entry.separator as string })
        continue
      }
      if (!('to' in entry)) continue
      const permission: string | null = entry.permission
      if (permission !== null && !allows(permission)) continue
      const to = entry.to as { name: string }
      if (!to || typeof to === 'function') continue
      const aliases = 'aliases' in entry ? (entry.aliases as readonly string[] | undefined) : undefined
      routes.push({ name: to.name, to, title: entry.title as string, icon: entry.icon, ...(aliases ? { aliases } : {}) })
    }
    if (routes.at(-1) && 'separator' in routes.at(-1)!) routes.pop()
    return routes.length ? [{ ...module, routes }] : []
  })
}

export function matchesNavigationPath(path: string, entryPath: string) {
  return path === entryPath || path.startsWith(`${entryPath}/`)
}

/** Finds entrypoint module owning path, by segment boundary then longest match. */
export function activeNavigationModule(path: string, resolve: (to: unknown) => { path: string }, allows: (permission: string) => boolean): string | undefined {
  const candidates = visibleNavigation(allows).flatMap((module, index) =>
    module.routes.flatMap((route) => {
      if ('separator' in route) return []
      const entryPath = resolve(route.to).path
      return matchesNavigationPath(path, entryPath) ? [{ name: module.name, pathLength: entryPath.length, index }] : []
    })
  )
  return candidates.sort((left, right) => right.pathLength - left.pathLength || left.index - right.index)[0]?.name
}
