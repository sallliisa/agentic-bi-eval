import { defineRoute } from '@southneuhof/sprindle'
import { requirePermission } from '../../../../../identity'
import { getModel } from '../../../../../cloudflare-os/management'
import { contextModelSchema } from '../../schema'

export const GET = defineRoute({
  authorize: requirePermission('view-model-providers'),
  action: async ({ params }) => ({ data: contextModelSchema.parse(await getModel(params.modelKey)) }),
})
