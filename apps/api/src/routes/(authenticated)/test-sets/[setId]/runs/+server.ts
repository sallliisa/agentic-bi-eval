import { defineRoute } from '@southneuhof/sprindle'
import { requireOrgIdentity, requirePermission } from '../../../../../identity'
import { readJsonBody } from '../../../../../request-body'
import { startTestRun } from '../../../../../test-runner/execute'
import { testRunStartInputSchema } from '../../schema'

export const POST = defineRoute({
  openapi: { requestBody: testRunStartInputSchema },
  authorize: requirePermission('execute-test-runs'),
  action: async (args) => {
    const identity = await requireOrgIdentity(args)
    const input = testRunStartInputSchema.parse(await readJsonBody(args.c))
    const run = await startTestRun(args.params.setId, identity.userId, input)
    return args.c.json({ data: run }, 201)
  },
})
