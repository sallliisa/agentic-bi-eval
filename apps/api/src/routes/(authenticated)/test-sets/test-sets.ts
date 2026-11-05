import { defineDomainPart } from '@southneuhof/sprindle/model'
import { testCase } from './test-cases.entity'
import { testCases } from './test-cases.table'
import { testSet } from './test-sets.entity'
import { testSets } from './test-sets.table'

export const domain = defineDomainPart({
  tables: { testSets, testCases },
  entities: [testSet, testCase],
})
