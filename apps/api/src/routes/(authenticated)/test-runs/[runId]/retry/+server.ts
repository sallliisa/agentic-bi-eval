import { defineRoute } from '@southneuhof/sprindle'
import { requirePermission } from '../../../../../identity'
import { retryTestRun } from '../../../../../test-runner/execute'

export const POST = defineRoute({
  authorize: requirePermission('execute-test-runs'),
  action: async ({ c, params }) => c.json({ data: await retryTestRun(params.runId) }, 202),
})
