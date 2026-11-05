import { z } from 'zod/v4'

export const caseName = z.string().trim().min(1).max(160)
export const prompt = z.string().refine((value) => value.trim().length > 0, 'Prompt is required.')

export const testCaseCreateInputSchema = z.object({
  name: caseName,
  prompt,
  expectedResult: z.string(),
})

export const testCaseUpdateInputSchema = testCaseCreateInputSchema.partial().refine((value) => Object.keys(value).length > 0, 'At least one field is required.')

export const testCaseReorderInputSchema = z.object({ caseIds: z.array(z.string()) })

export const testRunStartInputSchema = z.object({
  name: z.string().trim().optional(),
  modelId: z.string().min(1),
  repetitions: z.number().int().positive(),
})
