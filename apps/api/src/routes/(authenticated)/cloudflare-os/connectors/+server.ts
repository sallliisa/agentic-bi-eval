import { defineRoute } from '@southneuhof/sprindle'
import { requirePermission } from '../../../../identity'
import { listConnectors } from '../../../../cloudflare-os/management'
import { connectorListSchema } from '../schema'

export const GET = defineRoute({
  authorize: requirePermission('view-connectors'),
  action: async () => connectorListSchema.parse(await listConnectors()),
})
