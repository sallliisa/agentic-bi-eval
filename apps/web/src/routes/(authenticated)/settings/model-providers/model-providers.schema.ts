import { z } from 'zod/v4'
import { contextModelSchema } from '@southneuhof/api/src/routes/(authenticated)/cloudflare-os/schema.ts'

export const modelRecordSchema = contextModelSchema
export const gatewayProviderSchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'google', 'cloudflare', 'ollama']),
  enabled: z.boolean(),
  enabledBy: z.enum(['environment', 'admin']).optional(),
  needsApiToken: z.boolean(),
})

export type ModelRecord = z.output<typeof modelRecordSchema>
export type GatewayProviderRecord = z.output<typeof gatewayProviderSchema>
