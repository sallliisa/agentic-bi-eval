import { z } from 'zod/v4'

const isoDateSchema = z.union([z.date(), z.string()]).transform((value) => {
  const parsed = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(parsed.getTime())) throw new Error('Cloudflare OS returned an invalid date.')
  return parsed.toISOString()
})

export const instructionInputSchema = z.object({ text: z.string().max(8000) })
export const instructionRecordSchema = z.object({ text: z.string().max(8000) })

export const collectionVisibilitySchema = z.enum(['private', 'public'])
export const collectionSourceSchema = z.enum(['web', 'git'])

export const collectionCreateInputSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string(),
  icon: z.string().optional(),
  visibility: collectionVisibilitySchema,
})

export const collectionUpdateInputSchema = z.object({
  title: z.string().trim().min(1).optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
}).refine((value) => Object.keys(value).length > 0, 'At least one field is required.')

export const collectionRecordSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  description: z.string(),
  icon: z.string().optional(),
  visibility: collectionVisibilitySchema,
  source: collectionSourceSchema,
  documentCount: z.number().int().nonnegative(),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
  canEdit: z.boolean(),
  canDelete: z.boolean(),
})

export const collectionListSchema = z.object({
  data: z.array(collectionRecordSchema),
  total: z.number().int().nonnegative(),
  available: z.boolean(),
  canCreatePublic: z.boolean(),
})

export const collectionCapabilitiesSchema = z.object({
  canCreatePublic: z.boolean(),
  available: z.boolean(),
})

export const contextContentTypeSchema = z.string().trim().min(1).max(256)

export const documentCreateInputSchema = z.object({
  kind: z.literal('document'),
  path: z.string().min(1).max(1024),
  description: z.string().max(16000),
  contentType: contextContentTypeSchema,
  body: z.string(),
})

export const skillCreateInputSchema = z.object({
  kind: z.literal('skill'),
  path: z.string().min(1).max(1024).refine((value) => value.split('/').at(-1) === 'SKILL.md', 'Skill path must end with SKILL.md.'),
  name: z.string().trim().min(1).max(64).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().min(1).max(1024),
  body: z.string(),
})

export const contextItemCreateInputSchema = z.discriminatedUnion('kind', [
  documentCreateInputSchema,
  skillCreateInputSchema,
])

export const documentUpdateInputSchema = z.object({
  kind: z.literal('document'),
  description: z.string().max(16000),
  body: z.string(),
})

export const skillUpdateInputSchema = z.object({
  kind: z.literal('skill'),
  body: z.string(),
})

export const contextItemUpdateInputSchema = z.discriminatedUnion('kind', [documentUpdateInputSchema, skillUpdateInputSchema])

export const contextDocumentSchema = z.object({
  path: z.string(),
  name: z.string(),
  description: z.string(),
  contentType: z.string(),
  body: z.string(),
  skillName: z.string().optional(),
  lastUpdated: isoDateSchema,
})

export const contextDocumentSummarySchema = z.object({
  path: z.string(),
  name: z.string(),
  description: z.string(),
  contentType: z.string(),
  skillName: z.string().optional(),
  skillError: z.string().optional(),
  lastUpdated: isoDateSchema,
  collectionEditable: z.boolean(),
})

export const contextDocumentListSchema = z.object({
  data: z.array(contextDocumentSummarySchema),
  total: z.number().int().nonnegative(),
})

export const contextModelSchema = z.object({
  key: z.string(),
  id: z.string(),
  name: z.string(),
  source: z.enum(['account', 'gateway']),
  provider: z.enum(['openai', 'anthropic', 'google', 'cloudflare', 'ollama']),
  model: z.string(),
  endpoint: z.string().nullable(),
  contextWindow: z.number().int().positive().nullable(),
  outputLimit: z.number().int().positive().nullable(),
  mode: z.enum(['enabled', 'hidden', 'disabled']).nullable(),
  added: z.boolean().nullable(),
  runtimeKnown: z.boolean().nullable(),
})

export const modelListSchema = z.object({
  data: z.array(contextModelSchema),
  total: z.number().int().nonnegative(),
  gatewayStatus: z.enum(['unavailable', 'inactive', 'active']),
  gatewayProviders: z.array(z.object({
    provider: z.enum(['openai', 'anthropic', 'google', 'cloudflare', 'ollama']),
    enabled: z.boolean(),
    enabledBy: z.enum(['environment', 'admin']).optional(),
    needsApiToken: z.boolean(),
  })),
})

export const connectorResourceSchema = z.object({
  urlPattern: z.string(),
  title: z.string(),
  description: z.string(),
  enabled: z.boolean(),
})

export const connectorRecordSchema = z.discriminatedUnion('autoProvisions', [
  z.object({
    vendorId: z.string(),
    displayName: z.string(),
    autoProvisions: z.literal(false),
    enabled: z.boolean(),
    resources: z.array(connectorResourceSchema),
  }),
  z.object({
    vendorId: z.string(),
    displayName: z.string(),
    autoProvisions: z.literal(true),
    ambientMode: z.enum(['disabled', 'optional', 'enabled']),
  }),
])

export const connectorListSchema = z.object({
  data: z.array(connectorRecordSchema),
  total: z.number().int().nonnegative(),
})
