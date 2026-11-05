import { createHonoResourceActions, parseHonoResponse } from '@/framework/hono'
import type { CollectionLoadContext, CollectionResult, RecordLoadContext } from '@southneuhof/loom'
import { rpc } from '@/framework/rpc'
import {
  testRunCaseSummaryRecordSchema,
  testRunModelRecordSchema,
  testRunRecordSchema,
  testRunResultRecordSchema,
  testRunsQuerySchema,
  type TestRunCaseSummaryRecord,
  type TestRunModelRecord,
  type TestRunRecord,
  type TestRunResultRecord,
} from './test-runs.schema'

const api = createHonoResourceActions(rpc['test-runs'], { querySchema: testRunsQuerySchema })

async function listRuns(context: CollectionLoadContext): Promise<CollectionResult<TestRunRecord>> {
  const result = await api.list(context)
  return { ...result, data: result.data.map((record) => testRunRecordSchema.parse(record)) }
}

async function runDetail(context: RecordLoadContext) {
  const result = await api.detail(context)
  return result ? testRunRecordSchema.parse(result) : undefined
}

async function listResults({ searchParameters, signal }: CollectionLoadContext): Promise<CollectionResult<TestRunResultRecord>> {
  const runId = String(searchParameters.runId ?? '')
  if (!runId) return { data: [] }
  const endpoint = rpc['test-runs'][':runId'].results.$get
  const result = await parseHonoResponse<typeof endpoint>(await endpoint({ param: { runId } }, { init: { signal } }))
  const data = result.data.map((record) => testRunResultRecordSchema.parse(record))
  return { data, meta: { total: data.length, page: 1, pageSize: data.length, totalPage: data.length ? 1 : 0 } }
}

async function listRunModels({ signal }: { signal?: AbortSignal }): Promise<readonly TestRunModelRecord[]> {
  const endpoint = rpc['test-runs'].models.$get
  const result = await parseHonoResponse<typeof endpoint>(await endpoint({}, { init: { signal } }))
  return result.data.map((record) => testRunModelRecordSchema.parse(record))
}

async function listCaseSummaries(context: CollectionLoadContext): Promise<CollectionResult<TestRunCaseSummaryRecord>> {
  const results = await listResults(context)
  const groups = new Map<string, TestRunResultRecord[]>()
  for (const result of results.data) {
    const key = JSON.stringify([result.position, result.caseName, result.prompt, result.expectedResult])
    const attempts = groups.get(key) ?? []
    attempts.push(result)
    groups.set(key, attempts)
  }
  const data = [...groups.values()].map((attempts) => {
    const first = attempts[0]
    if (!first) throw new Error('A test case result has no repetitions.')
    return testRunCaseSummaryRecordSchema.parse({
      id: first.id,
      position: first.position,
      caseName: first.caseName,
      passRatio: `${attempts.filter((attempt) => attempt.verdict === 'PASS').length}/${attempts.length}`,
      attempts: [...attempts].sort((left, right) => left.repetition - right.repetition),
    })
  })
  return { data, meta: { total: data.length, page: 1, pageSize: data.length, totalPage: data.length ? 1 : 0 } }
}

async function retryResult(input: { runId: string; resultId: string }) {
  const endpoint = rpc['test-runs'][':runId'].results[':resultId'].retry.$post
  const result = await parseHonoResponse<typeof endpoint, 202>(await endpoint({ param: input }))
  return testRunResultRecordSchema.parse(result.data)
}

async function retryRun(input: { runId: string }) {
  const endpoint = rpc['test-runs'][':runId'].retry.$post
  const result = await parseHonoResponse<typeof endpoint, 202>(await endpoint({ param: input }))
  return testRunRecordSchema.parse(result.data)
}

async function retryErrors(input: { runId: string }) {
  const endpoint = rpc['test-runs'][':runId']['retry-errors'].$post
  const result = await parseHonoResponse<typeof endpoint, 202>(await endpoint({ param: input }))
  return testRunRecordSchema.parse(result.data)
}

async function stopRun(input: { runId: string }) {
  const endpoint = rpc['test-runs'][':runId'].stop.$post
  const result = await parseHonoResponse<typeof endpoint>(await endpoint({ param: input }))
  return testRunRecordSchema.parse(result.data)
}

export const testRunsActions = { ...api, list: listRuns, detail: runDetail, listResults, listRunModels, listCaseSummaries, retryResult, retryRun, retryErrors, stopRun }
