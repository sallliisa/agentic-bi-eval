import { defineRoute, notFound } from '@southneuhof/sprindle'
import { and, eq } from 'drizzle-orm'
import { getDb } from '../../../../../../db'
import { requireOrgIdentity, requirePermission } from '../../../../../../identity'
import { readJsonBody } from '../../../../../../request-body'
import { testCaseUpdateInputSchema } from '../../../schema'
import { testCaseSelectSchema } from '../../../test-cases.schema'
import { testCases } from '../../../test-cases.table'

export const GET = defineRoute({
  authorize: requirePermission('view-test-sets'),
  action: async ({ c, params }) => {
    const row = (await getDb().select().from(testCases).where(and(
      eq(testCases.id, params.caseId),
      eq(testCases.setId, params.setId),
    )).limit(1))[0]
    if (!row) throw notFound()
    return c.json({ data: testCaseSelectSchema.parse(row) })
  },
})

export const PATCH = defineRoute({
  openapi: { requestBody: testCaseUpdateInputSchema },
  authorize: requirePermission('manage-test-sets'),
  action: async (args) => {
    const input = testCaseUpdateInputSchema.parse(await readJsonBody(args.c))
    const identity = await requireOrgIdentity(args)
    const saved = await getDb().transaction(async (tx) => {
      const rows = await tx.update(testCases).set({
        ...input,
        updatedByUserId: identity.userId,
        updatedAt: new Date().toISOString(),
      }).where(and(
        eq(testCases.id, args.params.caseId),
        eq(testCases.setId, args.params.setId),
      )).returning()
      return rows[0]
    })
    if (!saved) throw notFound()
    return args.c.json({ data: testCaseSelectSchema.parse(saved) })
  },
})

export const DELETE = defineRoute({
  authorize: requirePermission('manage-test-sets'),
  action: async ({ c, params }) => {
    const rows = await getDb().delete(testCases).where(and(
      eq(testCases.id, params.caseId),
      eq(testCases.setId, params.setId),
    )).returning({ id: testCases.id })
    if (!rows[0]) throw notFound()
    return c.json({ ok: true })
  },
})
