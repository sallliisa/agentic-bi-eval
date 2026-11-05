import { defineRoute, notFound } from '@southneuhof/sprindle'
import { and, asc, desc, eq, ilike } from 'drizzle-orm'
import { getDb } from '../../../../../db'
import { requireOrgIdentity, requirePermission } from '../../../../../identity'
import { readJsonBody } from '../../../../../request-body'
import { testCaseCreateInputSchema } from '../../schema'
import { testCaseSelectSchema } from '../../test-cases.schema'
import { testCases } from '../../test-cases.table'
import { testSets } from '../../test-sets.table'

export const GET = defineRoute({
  authorize: requirePermission('view-test-sets'),
  action: async ({ c, params }) => {
    const setId = params.setId
    const search = c.req.query('search')
    const set = (await getDb().select({ id: testSets.id }).from(testSets).where(eq(testSets.id, setId)).limit(1))[0]
    if (!set) throw notFound()
    const data = await getDb().select().from(testCases).where(search
      ? and(eq(testCases.setId, setId), ilike(testCases.name, `%${search}%`))
      : eq(testCases.setId, setId)).orderBy(asc(testCases.position), asc(testCases.id))
    return c.json({ data: data.map((row) => testCaseSelectSchema.parse(row)), total: data.length })
  },
})

export const POST = defineRoute({
  openapi: { requestBody: testCaseCreateInputSchema },
  authorize: requirePermission('manage-test-sets'),
  action: async (args) => {
    const { c } = args
    const setId = args.params.setId
    const input = testCaseCreateInputSchema.parse(await readJsonBody(c))
    const identity = await requireOrgIdentity(args)
    const saved = await getDb().transaction(async (tx) => {
      const set = await tx.select({ id: testSets.id }).from(testSets).where(eq(testSets.id, setId)).limit(1)
      if (!set[0]) throw notFound()
      const lastCase = await tx.select({ position: testCases.position }).from(testCases)
        .where(eq(testCases.setId, setId)).orderBy(desc(testCases.position)).limit(1)
      const now = new Date().toISOString()
      const rows = await tx.insert(testCases).values({
        ...input,
        setId,
        position: (lastCase[0]?.position ?? -1) + 1,
        createdByUserId: identity.userId,
        updatedByUserId: identity.userId,
        createdAt: now,
        updatedAt: now,
      }).returning()
      return rows[0]
    })
    return c.json({ data: testCaseSelectSchema.parse(saved) }, 201)
  },
})
