import { createEntity } from '@southneuhof/sprindle/entity'
import { testRunUpdateSchema } from './schema'
import { testRunCreateSchema, testRunResultCreateSchema, testRunResultSelectSchema, testRunResultUpdateSchema, testRunSelectSchema } from './test-runs.schema'
import { testRunResults } from './test-run-results.table'
import { testRuns } from './test-runs.table'

export const testRun = createEntity({
  table: testRuns,
  schemas: {
    create: testRunCreateSchema,
    update: testRunUpdateSchema,
    select: testRunSelectSchema,
  },
})

export const testRunResult = createEntity({
  table: testRunResults,
  schemas: {
    create: testRunResultCreateSchema,
    update: testRunResultUpdateSchema,
    select: testRunResultSelectSchema,
  },
})
