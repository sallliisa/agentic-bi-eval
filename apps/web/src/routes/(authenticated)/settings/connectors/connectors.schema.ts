import { z } from 'zod/v4'
import { connectorResourceSchema } from '@southneuhof/api/src/routes/(authenticated)/cloudflare-os/schema.ts'

export const connectorDisplaySchema = z.object({
  vendorId: z.string(),
  displayName: z.string(),
  autoProvisions: z.boolean(),
  enabled: z.boolean().optional(),
  ambientMode: z.enum(['disabled', 'optional', 'enabled']).optional(),
  resources: z.array(connectorResourceSchema),
})

export type ConnectorDisplayRecord = z.output<typeof connectorDisplaySchema>
