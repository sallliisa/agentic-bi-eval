import { created, defineRoute } from '@southneuhof/sprindle'
import { requirePermission } from '../../../../../../identity'
import { readJsonBody } from '../../../../../../request-body'
import { createContextItem, listContextDocuments } from '../../../../../../cloudflare-os/management'
import { contextDocumentSchema, documentCreateInputSchema, contextDocumentListSchema } from '../../../schema'

export const GET = defineRoute({
  authorize: requirePermission('view-skills-context'),
  action: async ({ params }) => contextDocumentListSchema.parse(await listContextDocuments(params.collectionId)),
})

export const POST = defineRoute({
  openapi: { requestBody: documentCreateInputSchema },
  authorize: requirePermission('manage-skills-context'),
  action: async ({ c, params }) => {
    const input = documentCreateInputSchema.parse(await readJsonBody(c))
    return created(c, contextDocumentSchema.parse(await createContextItem(params.collectionId, input)))
  },
})
