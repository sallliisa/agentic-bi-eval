import { createEntity } from '@southneuhof/sprindle/entity'
import { testCaseInsertSchema, testCaseSelectSchema, testCaseUpdateSchema } from './test-cases.schema'
import { testCases } from './test-cases.table'

export const testCase = createEntity({
  table: testCases,
  schemas: {
    create: testCaseInsertSchema,
    update: testCaseUpdateSchema,
    select: testCaseSelectSchema,
  },
})
