import { defineRoute } from '@southneuhof/sprindle'
import { requirePermission } from '../../../../identity'
import { listModels } from '../../../../cloudflare-os/management'
import { modelListSchema } from '../schema'

export const GET = defineRoute({
  authorize: requirePermission('view-model-providers'),
  action: async () => {
    const result = modelListSchema.parse(await listModels())
    return { ...result }
  },
})
