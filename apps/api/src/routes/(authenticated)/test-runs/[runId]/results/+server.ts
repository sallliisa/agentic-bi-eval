import { defineRoute, notFound } from '@southneuhof/sprindle'
import { asc, eq } from 'drizzle-orm'
import { getDb } from '../../../../../db'
import { requirePermission } from '../../../../../identity'
import { testRunResultSelectSchema } from '../../test-runs.schema'
import { testRunResults } from '../../test-run-results.table'
import { testRuns } from '../../test-runs.table'

export const GET = defineRoute({
  authorize: requirePermission('view-test-runs'),
  action: async ({ c, params }) => {
    const run = (await getDb().select({ id: testRuns.id }).from(testRuns).where(eq(testRuns.id, params.runId)).limit(1))[0]
    if (!run) throw notFound()
    const rows = await getDb().select().from(testRunResults).where(eq(testRunResults.runId, params.runId)).orderBy(asc(testRunResults.position), asc(testRunResults.repetition), asc(testRunResults.id))
    const data = rows.map((row) => testRunResultSelectSchema.parse(row))
    return c.json({ data, total: data.length })
  },
})
