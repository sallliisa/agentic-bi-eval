import { defineRoute } from '@southneuhof/sprindle'
import { requirePermission } from '../../../../identity'
import { listCloudflareOsModels } from '../../../../test-runner/cloudflare-os'
import { testRunModelSchema } from '../test-runs.schema'

export const GET = defineRoute({
  authorize: requirePermission('execute-test-runs'),
  action: async () => ({ data: testRunModelSchema.array().parse(await listCloudflareOsModels()) }),
})
