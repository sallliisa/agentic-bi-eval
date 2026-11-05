import { defineRoute } from '@southneuhof/sprindle'
import { requirePermission } from '../../../../../identity'
import { getConnector } from '../../../../../cloudflare-os/management'
import { connectorRecordSchema } from '../../schema'

export const GET = defineRoute({
  authorize: requirePermission('view-connectors'),
  action: async ({ params }) => ({ data: connectorRecordSchema.parse(await getConnector(params.vendorId)) }),
})
