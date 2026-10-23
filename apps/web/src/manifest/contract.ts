import type { AppRouteName } from '@/router/route-names'

export type NavigationIcon = 'home' | 'inbox' | 'folder' | 'settings'
export type NavigationSeparator = { separator: string }
type NavigationSearch = { aliases?: readonly string[] }
export type NavigationAction = NavigationSearch & { action: { permission: string | null; to?: { name: AppRouteName; params?: Record<string, string> } }; title: string; icon: NavigationIcon }
export type NavigationDirect = NavigationSearch & { to: { name: AppRouteName }; permission: string | null; title: string; icon: NavigationIcon }
export type NavigationEntry = NavigationSeparator | NavigationAction | NavigationDirect
export type NavigationModule = {
  name: string
  title: string
  icon: NavigationIcon
  description?: string
} & ({ kind: 'module'; routes: readonly NavigationEntry[] } | { kind: 'standalone'; routes: readonly [NavigationDirect] })
export function defineNavigation<const TNavigation extends readonly NavigationModule[]>(navigation: TNavigation): TNavigation {
  return navigation
}
