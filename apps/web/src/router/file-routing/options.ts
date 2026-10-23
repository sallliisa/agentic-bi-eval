import type { Options } from 'vue-router/unplugin'
import { applyFileRouteConventions } from './layout-groups'
import { staticRouteName } from './names'
import { validateNavigationRoutes } from './validate-routes'
import type { NavigationModule } from '../../manifest/contract'

export function fileRouteOptions(navigation: readonly NavigationModule[]): Options {
  return {
    routesFolder: 'src/routes',
    extensions: ['.route.vue', '.layout.vue'],
    dts: 'src/route-map.d.ts',
    getRouteName: staticRouteName,
    beforeWriteFiles(root) {
      applyFileRouteConventions(root)
      validateNavigationRoutes(root, navigation)
    },
  }
}
