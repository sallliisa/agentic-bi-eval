import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-orm/zod'
import { testCases } from './test-cases.table'
import { caseName, prompt } from './schema'

const auditFields = { id: true, createdByUserId: true, updatedByUserId: true, createdAt: true, updatedAt: true } as const

export const testCaseInsertSchema = createInsertSchema(testCases).omit({ ...auditFields, position: true }).extend({
  name: caseName,
  prompt,
})

export const testCaseUpdateSchema = createUpdateSchema(testCases).omit({ ...auditFields, setId: true, position: true }).extend({
  name: caseName.optional(),
  prompt: prompt.optional(),
})

export const testCaseSelectSchema = createSelectSchema(testCases)
