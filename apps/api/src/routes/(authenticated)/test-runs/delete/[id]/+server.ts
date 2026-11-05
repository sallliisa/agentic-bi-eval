import { deleteRoute, HttpError, notFound } from '@southneuhof/sprindle'
import { and, eq, ne, SQL } from 'drizzle-orm'
import { getDb } from '../../../../../db'
import { requirePermission } from '../../../../../identity'
import { testRuns } from '../../test-runs.table'

export const DELETE = deleteRoute({
  authorize: requirePermission('execute-test-runs'),
  run: async ({ state }) => {
    const where = state.where
    if (where !== undefined && !(where instanceof SQL)) throw new Error('The test run delete scope must be a SQL predicate.')
    const deleted = await getDb().delete(testRuns)
      .where(and(eq(testRuns.id, state.id), where, ne(testRuns.status, 'running')))
      .returning({ id: testRuns.id })
    if (deleted.length) return
    const existing = await getDb().select({ id: testRuns.id }).from(testRuns)
      .where(and(eq(testRuns.id, state.id), where)).limit(1)
    if (!existing.length) throw notFound()
    throw new HttpError(409, 'test_run_running', 'Wait for this run to finish before deleting it.')
  },
})
