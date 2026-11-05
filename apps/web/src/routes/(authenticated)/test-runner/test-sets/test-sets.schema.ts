import { z } from 'zod/v4'
import { collectionQueryFields } from '@/framework/hono/collectionQuery'
import { rpc } from '@/framework/rpc'
import { checkedHonoCreateSchema, checkedHonoRecordSchema, checkedHonoUpdateSchema } from '@/framework/schema'

const setRecordSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  createdByUserId: z.string().nullable(),
  updatedByUserId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const testSetCreateInputSchema = checkedHonoCreateSchema(
  rpc['test-sets'],
  z.object({
    name: z.string().trim().min(1).max(160),
    description: z.string().max(4000).nullable().optional(),
  })
)
export const testSetRecordSchema = checkedHonoRecordSchema(rpc['test-sets'], setRecordSchema)
export const testSetUpdateInputSchema = checkedHonoUpdateSchema(
  rpc['test-sets'],
  z.object({
    name: z.string().trim().min(1).max(160).optional(),
    description: z.string().max(4000).nullable().optional(),
  })
)
export const testSetsQuerySchema = z.object({
  ...collectionQueryFields,
  sort_by: z.enum(['name', 'createdAt']).optional(),
})
