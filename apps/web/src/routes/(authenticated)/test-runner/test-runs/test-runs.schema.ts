import { z } from 'zod/v4'
import { collectionQueryFields } from '@/framework/hono/collectionQuery'

const runRecord = z.object({
  id: z.string(),
  setId: z.string(),
  name: z.string(),
  setName: z.string(),
  modelId: z.string().nullable(),
  repetitions: z.number().int().positive(),
  status: z.enum(['running', 'completed', 'failed', 'stopped']),
  error: z.string().nullable(),
  startedAt: z.string(),
  finishedAt: z.string().nullable(),
  createdByUserId: z.string().nullable(),
  createdAt: z.string(),
})

export const testRunRecordSchema = runRecord
export type TestRunRecord = z.output<typeof testRunRecordSchema>
export const testRunsQuerySchema = z.object(collectionQueryFields)

export const testRunResultRecordSchema = z.object({
  id: z.string(),
  runId: z.string(),
  caseName: z.string(),
  prompt: z.string(),
  expectedResult: z.string(),
  position: z.number().int(),
  repetition: z.number().int().positive(),
  actualResponse: z.string().nullable(),
  verdict: z.enum(['PASS', 'FAIL']).nullable(),
  error: z.string().nullable(),
  chatRef: z.string().nullable(),
  startedAt: z.string().nullable(),
  finishedAt: z.string().nullable(),
})
export type TestRunResultRecord = z.output<typeof testRunResultRecordSchema>

export const testRunModelRecordSchema = z.object({ id: z.string().min(1), name: z.string() })
export type TestRunModelRecord = z.output<typeof testRunModelRecordSchema>

export const testRunCaseSummaryRecordSchema = z.object({
  id: z.string(),
  position: z.number().int(),
  caseName: z.string(),
  passRatio: z.string(),
  attempts: z.array(testRunResultRecordSchema),
})
export type TestRunCaseSummaryRecord = z.output<typeof testRunCaseSummaryRecordSchema>
