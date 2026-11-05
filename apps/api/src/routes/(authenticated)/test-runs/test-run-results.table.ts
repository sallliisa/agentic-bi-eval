import { sql } from 'drizzle-orm'
import { check, index, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { testRuns } from './test-runs.table'

export type TestVerdict = 'PASS' | 'FAIL'

export const testRunResults = pgTable('test_run_results', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  runId: text('run_id').notNull().references(() => testRuns.id, { onDelete: 'cascade' }),
  caseName: text('case_name').notNull(),
  prompt: text('prompt').notNull(),
  expectedResult: text('expected_result').notNull(),
  position: integer('position').notNull(),
  repetition: integer('repetition').notNull().default(1),
  actualResponse: text('actual_response'),
  verdict: text('verdict').$type<TestVerdict>(),
  error: text('error'),
  chatRef: text('chat_ref'),
  startedAt: timestamp('started_at', { mode: 'string' }),
  finishedAt: timestamp('finished_at', { mode: 'string' }),
}, (table) => [
  check('test_run_results_verdict_check', sql`${table.verdict} is null or ${table.verdict} in ('PASS', 'FAIL')`),
  check('test_run_results_repetition_check', sql`${table.repetition} > 0`),
  index('test_run_results_run_position_idx').on(table.runId, table.position, table.id),
])
