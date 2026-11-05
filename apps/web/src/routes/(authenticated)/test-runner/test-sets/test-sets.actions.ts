import { createHonoResourceActions, parseHonoResponse } from '@/framework/hono'
import { rpc } from '@/framework/rpc'
import { testCaseCreateInputSchema, testCaseReorderInputSchema, testCaseUpdateInputSchema } from '@southneuhof/api/src/routes/(authenticated)/test-sets/schema.ts'
import { testRunStartInputSchema } from '@southneuhof/api/src/routes/(authenticated)/test-sets/schema.ts'
import { testCaseRecordSchema, testCasesQuerySchema, type TestCaseRecord } from './test-cases.schema'
import { testSetsQuerySchema } from './test-sets.schema'
import type { CollectionLoadContext, CollectionResult } from '@southneuhof/loom'

const setApi = createHonoResourceActions(rpc['test-sets'], { querySchema: testSetsQuerySchema })
type TestCaseCreateInput = (typeof testCaseCreateInputSchema)['_output']
type TestCaseUpdateInput = (typeof testCaseUpdateInputSchema)['_output']
type TestCaseReorderInput = (typeof testCaseReorderInputSchema)['_output']
type TestRunStartInput = (typeof testRunStartInputSchema)['_output']

async function listCases({ query, searchParameters, signal }: CollectionLoadContext): Promise<CollectionResult<TestCaseRecord>> {
  const setId = String(searchParameters.setId ?? '')
  if (!setId) return { data: [] }
  const parsed = testCasesQuerySchema.parse(query)
  const endpoint = rpc['test-sets'][':setId'].cases.$get
  const result = await parseHonoResponse<typeof endpoint>(
    await endpoint(
      {
        param: { setId },
        query: parsed.search ? { search: parsed.search } : {},
      },
      { init: { signal } }
    )
  )
  const data = result.data.map((record) => testCaseRecordSchema.parse(record))
  return { data, meta: { total: data.length, page: 1, pageSize: data.length, totalPage: data.length ? 1 : 0 } }
}

async function caseDetail(setId: string, caseId: string): Promise<TestCaseRecord> {
  const endpoint = rpc['test-sets'][':setId'].cases[':caseId'].$get
  const result = await parseHonoResponse<typeof endpoint>(await endpoint({ param: { setId, caseId } }))
  return testCaseRecordSchema.parse(result.data)
}

async function createCase(setId: string, input: TestCaseCreateInput): Promise<TestCaseRecord> {
  const endpoint = rpc['test-sets'][':setId'].cases.$post
  const result = await parseHonoResponse<typeof endpoint, 201>(await endpoint({ param: { setId }, json: input }))
  return testCaseRecordSchema.parse(result.data)
}

async function updateCase(setId: string, caseId: string, input: TestCaseUpdateInput): Promise<TestCaseRecord> {
  const endpoint = rpc['test-sets'][':setId'].cases[':caseId'].$patch
  const result = await parseHonoResponse<typeof endpoint>(await endpoint({ param: { setId, caseId }, json: input }))
  return testCaseRecordSchema.parse(result.data)
}

async function deleteCase(setId: string, caseId: string): Promise<void> {
  const endpoint = rpc['test-sets'][':setId'].cases[':caseId'].$delete
  await parseHonoResponse<typeof endpoint>(await endpoint({ param: { setId, caseId } }))
}

async function reorderCases(setId: string, input: TestCaseReorderInput): Promise<void> {
  const endpoint = rpc['test-sets'][':setId'].cases.reorder.$patch
  await parseHonoResponse<typeof endpoint>(await endpoint({ param: { setId }, json: input }))
}

async function runSet(setId: string, input: TestRunStartInput) {
  const endpoint = rpc['test-sets'][':setId'].runs.$post
  const result = await parseHonoResponse<typeof endpoint, 201>(await endpoint({ param: { setId }, json: input }))
  return result.data
}

export const testSetsActions = {
  ...setApi,
  listCases,
  caseDetail,
  createCase,
  updateCase,
  deleteCase,
  reorderCases,
  runSet,
}
