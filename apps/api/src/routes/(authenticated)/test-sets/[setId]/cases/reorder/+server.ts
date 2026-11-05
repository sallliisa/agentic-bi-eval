import { defineRoute, notFound, validationError } from '@southneuhof/sprindle'
import { and, eq } from 'drizzle-orm'
import { getDb } from '../../../../../../db'
import { requireOrgIdentity, requirePermission } from '../../../../../../identity'
import { readJsonBody } from '../../../../../../request-body'
import { testCaseReorderInputSchema } from '../../../schema'
import { testCases } from '../../../test-cases.table'
import { testSets } from '../../../test-sets.table'

export const PATCH = defineRoute({
  openapi: { requestBody: testCaseReorderInputSchema },
  authorize: requirePermission('manage-test-sets'),
  action: async (args) => {
    const input = testCaseReorderInputSchema.parse(await readJsonBody(args.c))
    const identity = await requireOrgIdentity(args)
    await getDb().transaction(async (tx) => {
      const set = await tx.select({ id: testSets.id }).from(testSets).where(eq(testSets.id, args.params.setId)).limit(1)
      if (!set[0]) throw notFound()
      const currentCases = await tx.select({ id: testCases.id }).from(testCases).where(eq(testCases.setId, args.params.setId))
      const currentIds = new Set(currentCases.map(({ id }) => id))
      const requestedIds = new Set(input.caseIds)
      if (
        requestedIds.size !== input.caseIds.length
        || input.caseIds.length !== currentCases.length
        || input.caseIds.some((id) => !currentIds.has(id))
        || currentCases.some(({ id }) => !requestedIds.has(id))
      ) {
        throw validationError('The order must include every case exactly once.')
      }
      const now = new Date().toISOString()
      for (const [position, caseId] of input.caseIds.entries()) {
        const updated = await tx.update(testCases).set({
          position,
          updatedByUserId: identity.userId,
          updatedAt: now,
        }).where(and(eq(testCases.id, caseId), eq(testCases.setId, args.params.setId))).returning({ id: testCases.id })
        if (!updated[0]) throw validationError('The case order changed before it could be saved.')
      }
    })
    return args.c.json({ ok: true })
  },
})
