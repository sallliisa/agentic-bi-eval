import { defineDomainPart } from '@southneuhof/sprindle/model'
import { testRun, testRunResult } from './test-runs.entity'
import { testRunResults } from './test-run-results.table'
import { testRuns } from './test-runs.table'

export const domain = defineDomainPart({
  tables: { testRuns, testRunResults },
  entities: [testRun, testRunResult],
})
