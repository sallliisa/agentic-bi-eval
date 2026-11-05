import { check, index, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { testSets } from '../test-sets/test-sets.table'
import { users } from '../users/users.table'

export type TestRunStatus = 'running' | 'completed' | 'failed' | 'stopped'

export const testRuns = pgTable('test_runs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  setId: text('set_id').notNull().references(() => testSets.id, { onDelete: 'restrict' }),
  name: text('name').notNull(),
  setName: text('set_name').notNull(),
  modelId: text('model_id'),
  repetitions: integer('repetitions').notNull().default(1),
  status: text('status').$type<TestRunStatus>().notNull().default('running'),
  error: text('error'),
  startedAt: timestamp('started_at', { mode: 'string' }).notNull().defaultNow(),
  finishedAt: timestamp('finished_at', { mode: 'string' }),
  createdByUserId: text('created_by_user_id').references(() => users.id),
  createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
}, (table) => [
  check('test_runs_status_check', sql`${table.status} in ('running', 'completed', 'failed', 'stopped')`),
  check('test_runs_repetitions_check', sql`${table.repetitions} > 0`),
  index('test_runs_set_started_idx').on(table.setId, table.startedAt),
])
