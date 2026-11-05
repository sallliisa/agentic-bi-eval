import { z } from 'zod/v4'

export const testCaseRecordSchema = z.object({
  id: z.string(),
  setId: z.string(),
  name: z.string(),
  prompt: z.string(),
  expectedResult: z.string(),
  position: z.number().int(),
  createdByUserId: z.string().nullable(),
  updatedByUserId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export const testCasesQuerySchema = z.object({ search: z.string().optional() })
export type TestCaseRecord = z.output<typeof testCaseRecordSchema>
