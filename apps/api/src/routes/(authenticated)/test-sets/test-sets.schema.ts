import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-orm/zod'
import { z } from 'zod/v4'
import { optionalText } from '../../../schema'
import { testSets } from './test-sets.table'

const auditFields = { id: true, createdByUserId: true, updatedByUserId: true, createdAt: true, updatedAt: true } as const

export const testSetCreateSchema = createInsertSchema(testSets).omit(auditFields).extend({
  name: z.string().trim().min(1).max(160),
  description: optionalText(4000),
})

export const testSetUpdateSchema = createUpdateSchema(testSets).omit(auditFields).extend({
  name: z.string().trim().min(1).max(160).optional(),
  description: optionalText(4000),
})

export const testSetSelectSchema = createSelectSchema(testSets)
