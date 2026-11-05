import { defineRoute } from '@southneuhof/sprindle'
import { z } from 'zod/v4'
import { requirePermission } from '../../../../../../identity'
import { readJsonBody } from '../../../../../../request-body'
import { deleteContextDocument, getContextDocument, updateContextDocument } from '../../../../../../cloudflare-os/management'
import { contextDocumentSchema, contextItemUpdateInputSchema } from '../../../schema'

const documentPathSchema = z.string().min(1)

export const GET = defineRoute({
  authorize: requirePermission('view-skills-context'),
  action: async ({ c, params }) => ({ data: contextDocumentSchema.parse(await getContextDocument(params.collectionId, documentPathSchema.parse(c.req.query('path')))) }),
})

export const PATCH = defineRoute({
  openapi: { requestBody: contextItemUpdateInputSchema },
  authorize: requirePermission('manage-skills-context'),
  action: async ({ c, params }) => {
    const input = contextItemUpdateInputSchema.parse(await readJsonBody(c))
    return { data: contextDocumentSchema.parse(await updateContextDocument(params.collectionId, documentPathSchema.parse(c.req.query('path')), input)) }
  },
})

export const DELETE = defineRoute({
  authorize: requirePermission('manage-skills-context'),
  action: async ({ c, params }) => deleteContextDocument(params.collectionId, documentPathSchema.parse(c.req.query('path'))),
})
