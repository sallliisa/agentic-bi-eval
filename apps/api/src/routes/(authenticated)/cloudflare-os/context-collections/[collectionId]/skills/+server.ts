import { created, defineRoute } from '@southneuhof/sprindle'
import { requirePermission } from '../../../../../../identity'
import { readJsonBody } from '../../../../../../request-body'
import { createContextItem } from '../../../../../../cloudflare-os/management'
import { contextDocumentSchema, skillCreateInputSchema } from '../../../schema'

export const POST = defineRoute({
  openapi: { requestBody: skillCreateInputSchema },
  authorize: requirePermission('manage-skills-context'),
  action: async ({ c, params }) => {
    const input = skillCreateInputSchema.parse(await readJsonBody(c))
    return created(c, contextDocumentSchema.parse(await createContextItem(params.collectionId, input)))
  },
})
