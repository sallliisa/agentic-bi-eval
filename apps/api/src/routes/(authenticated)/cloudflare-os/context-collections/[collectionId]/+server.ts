import { defineRoute } from '@southneuhof/sprindle'
import { requirePermission } from '../../../../../identity'
import { readJsonBody } from '../../../../../request-body'
import { deleteContextCollection, getContextCollection, updateContextCollection } from '../../../../../cloudflare-os/management'
import { collectionRecordSchema, collectionUpdateInputSchema } from '../../schema'

export const GET = defineRoute({
  authorize: requirePermission('view-skills-context'),
  action: async ({ params }) => ({ data: collectionRecordSchema.parse(await getContextCollection(params.collectionId)) }),
})

export const PATCH = defineRoute({
  openapi: { requestBody: collectionUpdateInputSchema },
  authorize: requirePermission('manage-skills-context'),
  action: async ({ c, params }) => {
    const input = collectionUpdateInputSchema.parse(await readJsonBody(c))
    return { data: collectionRecordSchema.parse(await updateContextCollection(params.collectionId, input)) }
  },
})

export const DELETE = defineRoute({
  authorize: requirePermission('manage-skills-context'),
  action: async ({ params }) => deleteContextCollection(params.collectionId),
})
