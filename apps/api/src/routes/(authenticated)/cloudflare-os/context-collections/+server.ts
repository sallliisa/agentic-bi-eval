import { created, defineRoute } from '@southneuhof/sprindle'
import { requirePermission } from '../../../../identity'
import { readJsonBody } from '../../../../request-body'
import { createContextCollection, listContextCollections } from '../../../../cloudflare-os/management'
import { collectionCreateInputSchema, collectionListSchema, collectionRecordSchema } from '../schema'

export const GET = defineRoute({
  authorize: requirePermission('view-skills-context'),
  action: async () => collectionListSchema.parse(await listContextCollections()),
})

export const POST = defineRoute({
  openapi: { requestBody: collectionCreateInputSchema },
  authorize: requirePermission('manage-skills-context'),
  action: async ({ c }) => {
    const input = collectionCreateInputSchema.parse(await readJsonBody(c))
    return created(c, collectionRecordSchema.parse(await createContextCollection(input)))
  },
})
