import { z } from 'zod/v4'
import { collectionRecordSchema, contextContentTypeSchema, contextDocumentSchema, contextDocumentSummarySchema } from '@southneuhof/api/src/routes/(authenticated)/cloudflare-os/schema.ts'

export const collectionRecord = collectionRecordSchema
export const contextDocumentRecord = contextDocumentSchema
export const contextDocumentSummary = contextDocumentSummarySchema

export const contextItemFormSchema = z.object({
  kind: z.enum(['document', 'skill']),
  path: z.string().min(1).max(1024),
  name: z.string().optional(),
  description: z.string().max(16000),
  contentType: contextContentTypeSchema.optional(),
  body: z.string(),
})

export const documentEditFormSchema = z.object({
  kind: z.enum(['document', 'skill']),
  description: z.string().max(16000).optional(),
  body: z.string(),
})

export type CollectionRecord = z.output<typeof collectionRecord>
export type ContextDocumentRecord = z.output<typeof contextDocumentRecord>
export type ContextDocumentSummary = z.output<typeof contextDocumentSummary>
export type DocumentEditForm = z.output<typeof documentEditFormSchema>
