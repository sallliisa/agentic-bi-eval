import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-orm/zod'
import { z } from 'zod/v4'
import { testRunResults } from './test-run-results.table'
import { testRuns } from './test-runs.table'

export const testRunCreateSchema = createInsertSchema(testRuns)
export const testRunSelectSchema = createSelectSchema(testRuns)
export const testRunResultCreateSchema = createInsertSchema(testRunResults)
export const testRunResultUpdateSchema = createUpdateSchema(testRunResults)
export const testRunResultSelectSchema = createSelectSchema(testRunResults)

export const testRunModelSchema = z.object({ id: z.string().min(1), name: z.string() })
