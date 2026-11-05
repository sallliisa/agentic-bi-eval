import { index, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { users } from '../users/users.table'
import { testSets } from './test-sets.table'

export const testCases = pgTable('test_cases', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  setId: text('set_id').notNull().references(() => testSets.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  prompt: text('prompt').notNull(),
  expectedResult: text('expected_result').notNull(),
  position: integer('position').notNull().default(0),
  createdByUserId: text('created_by_user_id').references(() => users.id),
  updatedByUserId: text('updated_by_user_id').references(() => users.id),
  createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'string' }).notNull().defaultNow(),
}, (table) => [index('test_cases_set_position_idx').on(table.setId, table.position, table.id)])
