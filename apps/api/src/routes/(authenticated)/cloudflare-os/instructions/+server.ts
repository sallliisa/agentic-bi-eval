import { defineRoute } from '@southneuhof/sprindle'
import { requirePermission } from '../../../../identity'
import { readJsonBody } from '../../../../request-body'
import { getInstanceInstructions, setInstanceInstructions } from '../../../../cloudflare-os/management'
import { instructionInputSchema, instructionRecordSchema } from '../schema'

export const GET = defineRoute({
  authorize: requirePermission('view-agent-instructions'),
  action: async () => ({ data: instructionRecordSchema.parse(await getInstanceInstructions()) }),
})

export const PUT = defineRoute({
  openapi: { requestBody: instructionInputSchema },
  authorize: requirePermission('manage-agent-instructions'),
  action: async ({ c }) => {
    const input = instructionInputSchema.parse(await readJsonBody(c))
    return { data: instructionRecordSchema.parse(await setInstanceInstructions(input.text)) }
  },
})
