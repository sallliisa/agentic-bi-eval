import { createEntity } from '@southneuhof/sprindle/entity'
import { testSetCreateSchema, testSetSelectSchema, testSetUpdateSchema } from './test-sets.schema'
import { testSets } from './test-sets.table'

export const testSet = createEntity({
  table: testSets,
  schemas: {
    create: testSetCreateSchema,
    update: testSetUpdateSchema,
    select: testSetSelectSchema,
  },
})
