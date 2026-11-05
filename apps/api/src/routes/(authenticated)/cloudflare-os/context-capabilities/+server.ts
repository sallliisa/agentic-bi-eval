import { defineRoute } from '@southneuhof/sprindle'
import { requirePermission } from '../../../../identity'
import { getContextCapabilities } from '../../../../cloudflare-os/management'
import { collectionCapabilitiesSchema } from '../schema'

export const GET = defineRoute({
  authorize: requirePermission('view-skills-context'),
  action: async () => collectionCapabilitiesSchema.parse(await getContextCapabilities()),
})
