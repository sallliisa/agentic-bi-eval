import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { and, eq } from 'drizzle-orm'
import { app } from '../../../app'
import { closeDb, getDb } from '../../../db'
import { createSystemSession, testId } from '../../../testing/session'
import { testCaseSelectSchema } from './test-cases.schema'
import { testCases } from './test-cases.table'
import { testSets } from './test-sets.table'
import { testRuns } from '../test-runs/test-runs.table'
import { testRunResults } from '../test-runs/test-run-results.table'
import { testRunResultSelectSchema } from '../test-runs/test-runs.schema'

const runnerMock = vi.hoisted(() => {
  const state: { prompts: string[]; pending?: Promise<void>; errorPrompts: Set<string>; pendingPrompts: Map<string, Promise<void>>; cancelledPrompts: string[]; cancellation?: Promise<void>; cancellationError?: string; stoppedChatRefs: string[] } = { prompts: [], errorPrompts: new Set(), pendingPrompts: new Map(), cancelledPrompts: [], stoppedChatRefs: [] }
  return state
})

vi.mock('../../../test-runner/cloudflare-os', () => ({
  stopCloudflareOsChats: vi.fn(async (chatRefs: string[]) => {
    runnerMock.stoppedChatRefs.push(...chatRefs)
    await runnerMock.cancellation
    if (runnerMock.cancellationError) throw new Error(runnerMock.cancellationError)
  }),
  createCloudflareOsRunner: vi.fn(async (_modelId: string | null, signal: AbortSignal) => ({
    run: async (prompt: string, saveChatRef: (chatRef: string) => Promise<void>) => {
      runnerMock.prompts.push(prompt)
      const index = runnerMock.prompts.length
      const pending = runnerMock.pendingPrompts.get(prompt) ?? runnerMock.pending
      await saveChatRef(`chat-${index}`)
      let onAbort: (() => void) | undefined
      try {
        signal.throwIfAborted()
        await Promise.race([
          pending,
          new Promise<never>((_resolve, reject) => {
            onAbort = () => reject(signal.reason)
            signal.addEventListener('abort', onAbort, { once: true })
          }),
        ])
      } catch (error) {
        if (signal.aborted) {
          runnerMock.cancelledPrompts.push(prompt)
          await runnerMock.cancellation
          if (runnerMock.cancellationError) throw new Error(runnerMock.cancellationError)
        }
        throw error
      } finally {
        if (onAbort) signal.removeEventListener('abort', onAbort)
      }
      if (runnerMock.errorPrompts.has(prompt)) throw new Error('Provider request failed.')
      return ['  expected one \n', '{"b":2,"a":1}', '{"items":[2,1]}', '{"items":[1,2]}'][index - 1] ?? 'unexpected response'
    },
    close: () => undefined,
  })),
}))

const permissions = ['view-test-sets', 'manage-test-sets', 'execute-test-runs', 'view-test-runs']
const setIds: string[] = []
let cookie = ''

function request(method: string, path: string, body?: unknown, sessionCookie = cookie) {
  return app.request(path, {
    method,
    headers: { Cookie: sessionCookie, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
}

async function createSet(name: string) {
  const response = await request('POST', '/test-sets/create', { name, description: null })
  expect(response.status).toBe(201)
  const result = await response.json()
  const setId = result.data.id as string
  setIds.push(setId)
  return setId
}

describe('test runner routes', () => {
  beforeEach(async () => {
    runnerMock.prompts.length = 0
    runnerMock.pending = undefined
    runnerMock.errorPrompts.clear()
    runnerMock.pendingPrompts.clear()
    runnerMock.cancelledPrompts.length = 0
    runnerMock.stoppedChatRefs.length = 0
    runnerMock.cancellation = undefined
    runnerMock.cancellationError = undefined
    cookie = (await createSystemSession(permissions, 'test-runner')).cookie
  })

  afterEach(async () => {
    for (const setId of setIds.splice(0)) {
      const runs = await getDb().select({ id: testRuns.id }).from(testRuns).where(eq(testRuns.setId, setId))
      await getDb().delete(testRuns).where(eq(testRuns.setId, setId))
      await getDb().delete(testSets).where(eq(testSets.id, setId))
    }
  })

  afterAll(() => closeDb())

  it('scopes cases, runs saved inputs in position order, and keeps result snapshots', async () => {
    const setId = await createSet(`Runner ${testId('set')}`)
    const otherSetId = await createSet(`Other ${testId('set')}`)
    const prompts = ['  prompt first\n', 'prompt object', 'prompt array']
    const cases = [
      { name: 'First case', prompt: prompts[0], expectedResult: 'expected one' },
      { name: 'Object case', prompt: prompts[1], expectedResult: '{"a":1,"b":2}' },
      { name: 'Array case', prompt: prompts[2], expectedResult: '{"items":[1,2]}' },
    ]
    const caseIds: string[] = []

    for (const testCase of cases) {
      const response = await request('POST', `/test-sets/${setId}/cases`, testCase)
      expect(response.status).toBe(201)
      caseIds.push((await response.json()).data.id as string)
    }

    expect((await request('POST', `/test-sets/${setId}/cases`, { ...cases[0], prompt: '  \n ' })).status).toBe(400)
    const search = await request('GET', `/test-sets/${setId}/cases?search=Object`)
    expect(search.status).toBe(200)
    expect((await search.json()).data.map((row: { name: string }) => row.name)).toEqual(['Object case'])

    expect((await request('GET', `/test-sets/${otherSetId}/cases/${caseIds[0]}`)).status).toBe(404)
    expect((await request('PATCH', `/test-sets/${otherSetId}/cases/${caseIds[0]}`, { name: 'Wrong parent' })).status).toBe(404)
    expect((await request('DELETE', `/test-sets/${otherSetId}/cases/${caseIds[0]}`)).status).toBe(404)

    const runResponse = await request('POST', `/test-sets/${setId}/runs`, { modelId: 'test-model', repetitions: 1 })
    expect(runResponse.status).toBe(201)
    const runId = (await runResponse.json()).data.id as string

    expect((await request('PATCH', `/test-sets/${setId}/cases/${caseIds[0]}`, {
      name: 'Edited case', prompt: 'edited prompt', expectedResult: 'edited expected',
    })).status).toBe(200)
    expect((await request('DELETE', `/test-sets/${setId}/cases/${caseIds[1]}`)).status).toBe(200)

    await vi.waitFor(async () => {
      const run = (await getDb().select({ status: testRuns.status }).from(testRuns).where(eq(testRuns.id, runId)).limit(1))[0]
      expect(run?.status).toBe('completed')
    }, { timeout: 5000, interval: 50 })

    const resultsResponse = await request('GET', `/test-runs/${runId}/results`)
    expect(resultsResponse.status).toBe(200)
    const results = (await resultsResponse.json()).data
    expect(results.map((row: { caseName: string }) => row.caseName)).toEqual(['First case', 'Object case', 'Array case'])
    expect(results.map((row: { prompt: string }) => row.prompt)).toEqual(prompts)
    expect(results.map((row: { expectedResult: string }) => row.expectedResult)).toEqual(cases.map((testCase) => testCase.expectedResult))
    expect(results.map((row: { verdict: string }) => row.verdict)).toEqual(['PASS', 'PASS', 'FAIL'])
    expect(results.map((row: { actualResponse: string }) => row.actualResponse)).toEqual([
      '  expected one \n',
      '{"b":2,"a":1}',
      '{"items":[2,1]}',
    ])
    expect(results.map((row: { chatRef: string }) => row.chatRef)).toEqual(['chat-1', 'chat-2', 'chat-3'])
    expect(runnerMock.prompts).toEqual(prompts)

    const savedCases = await getDb().select({ id: testCases.id }).from(testCases).where(and(eq(testCases.setId, setId), eq(testCases.name, 'Edited case')))
    expect(savedCases).toHaveLength(1)
    expect(results).toHaveLength(3)

    const resultId = results[2].id
    const retryPath = `/test-runs/${runId}/results/${resultId}/retry`
    const viewer = await createSystemSession(['view-test-runs'], 'retry-viewer')
    expect((await request('POST', retryPath, undefined, viewer.cookie)).status).toBe(403)
    expect((await request('POST', `/test-runs/missing-run/results/${resultId}/retry`)).status).toBe(404)
    expect(runnerMock.prompts).toEqual(prompts)
    expect((await request('PATCH', `/test-sets/${setId}/cases/${caseIds[2]}`, {
      prompt: 'changed after the run', expectedResult: 'changed answer',
    })).status).toBe(200)

    let release: (() => void) | undefined
    runnerMock.pending = new Promise<void>((resolve) => { release = resolve })
    try {
      const retry = await request('POST', retryPath)
      expect(retry.status).toBe(202)
      expect((await retry.json()).data).toMatchObject({ id: resultId, prompt: prompts[2], verdict: null, actualResponse: null })
      expect((await request('POST', retryPath)).status).toBe(409)
    } finally {
      release?.()
      runnerMock.pending = undefined
    }

    await vi.waitFor(async () => {
      const run = (await getDb().select({ status: testRuns.status }).from(testRuns).where(eq(testRuns.id, runId)).limit(1))[0]
      expect(run?.status).toBe('completed')
    }, { timeout: 5000, interval: 50 })
    const retried = (await (await request('GET', `/test-runs/${runId}/results`)).json()).data
    expect(retried).toHaveLength(3)
    expect(retried.slice(0, 2)).toEqual(results.slice(0, 2))
    expect(retried[2]).toMatchObject({
      id: resultId,
      prompt: prompts[2],
      expectedResult: '{"items":[1,2]}',
      actualResponse: '{"items":[1,2]}',
      verdict: 'PASS',
      error: null,
      chatRef: 'chat-4',
    })
    expect(runnerMock.prompts).toEqual([...prompts, prompts[2]])
  })

  it('runs repetitions together and waits for the batch before the next case', async () => {
    const setId = await createSet(`Batches ${testId('set')}`)
    for (const prompt of ['first batch', 'second batch']) {
      const response = await request('POST', `/test-sets/${setId}/cases`, {
        name: prompt, prompt, expectedResult: 'expected one',
      })
      expect(response.status).toBe(201)
    }
    let releaseFirst: (() => void) | undefined
    let releaseSecond: (() => void) | undefined
    runnerMock.pending = new Promise<void>((resolve) => { releaseFirst = resolve })
    const response = await request('POST', `/test-sets/${setId}/runs`, { modelId: 'test-model', repetitions: 2 })
    expect(response.status).toBe(201)
    const runId = (await response.json()).data.id
    try {
      await vi.waitFor(() => {
        expect(runnerMock.prompts).toEqual(['first batch', 'first batch'])
      })
      const firstResults = (await (await request('GET', `/test-runs/${runId}/results`)).json()).data
      expect(firstResults.map((row: { verdict: string | null }) => row.verdict)).toEqual([null, null, null, null])
      runnerMock.pending = new Promise<void>((resolve) => { releaseSecond = resolve })
      releaseFirst?.()
      await vi.waitFor(() => {
        expect(runnerMock.prompts).toEqual(['first batch', 'first batch', 'second batch', 'second batch'])
      })
      const run = (await getDb().select().from(testRuns).where(eq(testRuns.id, runId)))[0]
      expect(run?.status).toBe('running')
    } finally {
      releaseFirst?.()
      releaseSecond?.()
      runnerMock.pending = undefined
      await vi.waitFor(async () => {
        const run = (await getDb().select().from(testRuns).where(eq(testRuns.id, runId)))[0]
        expect(run?.status).toBe('completed')
      }, { timeout: 5000, interval: 50 })
    }
    const results = (await (await request('GET', `/test-runs/${runId}/results`)).json()).data
    expect(results).toHaveLength(4)
    expect(results.every((row: { finishedAt: string | null }) => row.finishedAt !== null)).toBe(true)
  })

  it('retries only execution errors and permits name edits and finished run deletion', async () => {
    const setId = await createSet(`Run actions ${testId('set')}`)
    for (const testCase of [
      { name: 'Pass', prompt: 'pass prompt', expectedResult: 'expected one' },
      { name: 'Mismatch', prompt: 'mismatch prompt', expectedResult: 'different answer' },
      { name: 'Error', prompt: 'error prompt', expectedResult: '{"items":[1,2]}' },
    ]) {
      expect((await request('POST', `/test-sets/${setId}/cases`, testCase)).status).toBe(201)
    }
    runnerMock.errorPrompts.add('error prompt')
    const response = await request('POST', `/test-sets/${setId}/runs`, { modelId: 'test-model', repetitions: 1 })
    expect(response.status).toBe(201)
    const originalRun = (await response.json()).data
    const runId = originalRun.id
    const retryPath = `/test-runs/${runId}/retry-errors`
    const updatePath = `/test-runs/update/${runId}`
    const deletePath = `/test-runs/delete/${runId}`
    async function waitForCompletion() {
      await vi.waitFor(async () => {
        const run = (await getDb().select().from(testRuns).where(eq(testRuns.id, runId)))[0]
        expect(run?.status).toBe('completed')
      }, { timeout: 5000, interval: 50 })
    }
    async function readResults() {
      const result = await request('GET', `/test-runs/${runId}/results`)
      expect(result.status).toBe(200)
      return testRunResultSelectSchema.array().parse((await result.json()).data)
    }
    await waitForCompletion()
    const originalResults = await readResults()
    expect(originalResults.map(({ verdict }) => verdict)).toEqual(['PASS', 'FAIL', 'FAIL'])
    expect(originalResults.map(({ error }) => error)).toEqual([null, null, 'Provider request failed.'])
    const viewer = await createSystemSession(['view-test-runs'], 'run-actions-viewer')
    expect((await request('POST', retryPath, undefined, viewer.cookie)).status).toBe(403)
    expect((await request('PATCH', updatePath, { name: 'Denied' }, viewer.cookie)).status).toBe(403)
    expect((await request('DELETE', deletePath, undefined, viewer.cookie)).status).toBe(403)
    expect((await request('PATCH', updatePath, { name: ' ' })).status).toBe(400)
    expect((await request('PATCH', updatePath, { name: 'Changed', repetitions: 9 })).status).toBe(400)
    const renamed = await request('PATCH', updatePath, { name: ' Renamed run ' })
    expect(renamed.status).toBe(200)
    const savedRun = (await getDb().select().from(testRuns).where(eq(testRuns.id, runId)))[0]
    expect(savedRun).toMatchObject({ name: 'Renamed run', modelId: originalRun.modelId, repetitions: 1, status: 'completed' })
    expect(await readResults()).toEqual(originalResults)
    runnerMock.errorPrompts.clear()
    let release: (() => void) | undefined
    runnerMock.pending = new Promise<void>((resolve) => { release = resolve })
    try {
      expect((await request('POST', retryPath)).status).toBe(202)
      await vi.waitFor(() => {
        expect(runnerMock.prompts).toEqual(['pass prompt', 'mismatch prompt', 'error prompt', 'error prompt'])
      })
      expect((await request('POST', retryPath)).status).toBe(409)
      expect((await request('DELETE', deletePath)).status).toBe(409)
      const retryingResults = await readResults()
      expect(retryingResults.slice(0, 2)).toEqual(originalResults.slice(0, 2))
      expect(retryingResults[2]).toMatchObject({ verdict: null, error: null, actualResponse: null, finishedAt: null })
    } finally {
      release?.()
      runnerMock.pending = undefined
      await waitForCompletion()
    }
    const retriedResults = await readResults()
    expect(retriedResults.slice(0, 2)).toEqual(originalResults.slice(0, 2))
    expect(retriedResults[2]).toMatchObject({ prompt: 'error prompt', verdict: 'PASS', error: null, actualResponse: '{"items":[1,2]}' })
    const completedRun = (await getDb().select().from(testRuns).where(eq(testRuns.id, runId)))[0]
    expect((await request('POST', retryPath)).status).toBe(422)
    expect((await getDb().select().from(testRuns).where(eq(testRuns.id, runId)))[0]).toEqual(completedRun)
    expect(await readResults()).toEqual(retriedResults)
    expect(runnerMock.prompts).toHaveLength(4)
    expect((await request('DELETE', deletePath)).status).toBe(200)
    expect(await getDb().select().from(testRuns).where(eq(testRuns.id, runId))).toEqual([])
    expect(await getDb().select().from(testRunResults).where(eq(testRunResults.runId, runId))).toEqual([])
    expect(await getDb().select().from(testCases).where(eq(testCases.setId, setId))).toHaveLength(3)
    expect((await request('POST', retryPath)).status).toBe(404)
    expect((await request('PATCH', updatePath, { name: 'Missing' })).status).toBe(404)
    expect((await request('DELETE', deletePath)).status).toBe(404)
  })

  it('stops only the selected run, preserves completed results, and permits retrying stopped work', async () => {
    const setId = await createSet(`Stop ${testId('set')}`)
    const otherSetId = await createSet(`Continue ${testId('set')}`)
    for (const prompt of ['completed prompt', 'active prompt', 'queued prompt']) {
      expect((await request('POST', `/test-sets/${setId}/cases`, { name: prompt, prompt, expectedResult: 'expected one' })).status).toBe(201)
    }
    expect((await request('POST', `/test-sets/${otherSetId}/cases`, { name: 'Other', prompt: 'other prompt', expectedResult: 'expected one' })).status).toBe(201)
    let releaseActive: (() => void) | undefined
    let releaseOther: (() => void) | undefined
    let releaseCancellation: (() => void) | undefined
    runnerMock.pendingPrompts.set('active prompt', new Promise<void>((resolve) => { releaseActive = resolve }))
    runnerMock.pendingPrompts.set('other prompt', new Promise<void>((resolve) => { releaseOther = resolve }))
    runnerMock.cancellation = new Promise<void>((resolve) => { releaseCancellation = resolve })
    const runResponse = await request('POST', `/test-sets/${setId}/runs`, { modelId: 'test-model', repetitions: 2 })
    const otherResponse = await request('POST', `/test-sets/${otherSetId}/runs`, { modelId: 'test-model', repetitions: 1 })
    expect(runResponse.status).toBe(201)
    expect(otherResponse.status).toBe(201)
    const runId = (await runResponse.json()).data.id
    const otherRunId = (await otherResponse.json()).data.id
    const stopPath = `/test-runs/${runId}/stop`
    async function readRun(id: string) {
      return (await getDb().select().from(testRuns).where(eq(testRuns.id, id)))[0]
    }
    async function readResults() {
      const response = await request('GET', `/test-runs/${runId}/results`)
      expect(response.status).toBe(200)
      return testRunResultSelectSchema.array().parse((await response.json()).data)
    }
    let stopRequest: Promise<Response> | undefined
    try {
      await vi.waitFor(() => {
        expect(runnerMock.prompts.filter((prompt) => prompt === 'active prompt')).toHaveLength(2)
        expect(runnerMock.prompts).toContain('other prompt')
      })
      const originalResults = await readResults()
      const viewer = await createSystemSession(['view-test-runs'], 'stop-viewer')
      expect((await request('POST', stopPath, undefined, viewer.cookie)).status).toBe(403)
      expect((await request('POST', '/test-runs/missing-run/stop')).status).toBe(404)
      expect((await readRun(runId))?.status).toBe('running')
      stopRequest = Promise.resolve(request('POST', stopPath))
      await vi.waitFor(() => {
        expect(runnerMock.cancelledPrompts).toEqual(['active prompt', 'active prompt'])
      })
      expect((await readRun(runId))?.status).toBe('running')
      expect((await request('POST', `/test-runs/${runId}/retry-errors`)).status).toBe(409)
      expect((await request('DELETE', `/test-runs/delete/${runId}`)).status).toBe(409)
      releaseCancellation?.()
      const stopped = await stopRequest
      expect(stopped.status).toBe(200)
      expect((await stopped.json()).data).toMatchObject({ id: runId, status: 'stopped', error: 'Run stopped by user.' })
      expect((await readRun(runId))?.status).toBe('stopped')
      const stoppedResults = await readResults()
      expect(stoppedResults.slice(0, 2)).toEqual(originalResults.slice(0, 2))
      expect(stoppedResults.slice(2).map(({ verdict, error }) => ({ verdict, error }))).toEqual([
        { verdict: 'FAIL', error: 'Run stopped by user.' },
        { verdict: 'FAIL', error: 'Run stopped by user.' },
        { verdict: 'FAIL', error: 'Run stopped by user.' },
        { verdict: 'FAIL', error: 'Run stopped by user.' },
      ])
      expect(runnerMock.prompts).not.toContain('queued prompt')
      expect((await readRun(otherRunId))?.status).toBe('running')
      expect((await request('POST', stopPath)).status).toBe(409)
      releaseActive?.()
      runnerMock.pendingPrompts.delete('active prompt')
      expect((await request('POST', `/test-runs/${runId}/retry-errors`)).status).toBe(202)
      await vi.waitFor(async () => {
        expect((await readRun(runId))?.status).toBe('completed')
      }, { timeout: 5000, interval: 50 })
      expect((await readResults()).slice(0, 2)).toEqual(originalResults.slice(0, 2))
      expect(runnerMock.prompts.filter((prompt) => prompt === 'active prompt')).toHaveLength(4)
      expect(runnerMock.prompts.filter((prompt) => prompt === 'queued prompt')).toHaveLength(2)
    } finally {
      releaseCancellation?.()
      releaseActive?.()
      releaseOther?.()
      await stopRequest
      await vi.waitFor(async () => {
        expect((await readRun(runId))?.status).not.toBe('running')
        expect((await readRun(otherRunId))?.status).toBe('completed')
      }, { timeout: 5000, interval: 50 })
    }
  })

  it('reports remote cancellation failure instead of recording a stopped run', async () => {
    const setId = await createSet(`Stop failure ${testId('set')}`)
    expect((await request('POST', `/test-sets/${setId}/cases`, { name: 'Active', prompt: 'active prompt', expectedResult: 'expected one' })).status).toBe(201)
    let release: (() => void) | undefined
    runnerMock.pending = new Promise<void>((resolve) => { release = resolve })
    runnerMock.cancellationError = 'Remote cancellation failed.'
    const response = await request('POST', `/test-sets/${setId}/runs`, { modelId: 'test-model', repetitions: 1 })
    expect(response.status).toBe(201)
    const runId = (await response.json()).data.id
    try {
      await vi.waitFor(() => expect(runnerMock.prompts).toEqual(['active prompt']))
      expect((await request('POST', `/test-runs/${runId}/stop`)).status).toBe(502)
      const run = (await getDb().select().from(testRuns).where(eq(testRuns.id, runId)))[0]
      expect(run).toMatchObject({ status: 'failed', error: 'Remote cancellation failed.' })
    } finally {
      release?.()
      runnerMock.pending = undefined
    }
  })

  it('stops an abandoned run without a local worker and preserves other runs and completed results', async () => {
    const setId = await createSet(`Abandoned ${testId('set')}`)
    const runs = await getDb().insert(testRuns).values([
      { setId, name: 'Abandoned', setName: 'Snapshot', modelId: 'old-model', status: 'running' },
      { setId, name: 'Other', setName: 'Snapshot', modelId: 'old-model', status: 'running' },
    ]).returning()
    const runId = runs[0]?.id
    const otherRunId = runs[1]?.id
    if (!runId || !otherRunId) throw new Error('The run fixtures could not be saved.')
    const finishedAt = '2026-11-04T00:00:00.000Z'
    await getDb().insert(testRunResults).values([
      { runId, caseName: 'Completed', prompt: 'saved', expectedResult: 'answer', actualResponse: 'answer', position: 0, verdict: 'PASS', chatRef: '101', startedAt: finishedAt, finishedAt },
      { runId, caseName: 'Mismatch', prompt: 'saved', expectedResult: 'answer', actualResponse: 'different', position: 1, verdict: 'FAIL', chatRef: '102', startedAt: finishedAt, finishedAt },
      { runId, caseName: 'Stuck', prompt: 'saved', expectedResult: 'answer', position: 2, chatRef: '337', startedAt: finishedAt },
      { runId, caseName: 'Queued', prompt: 'saved', expectedResult: 'answer', position: 3 },
      { runId: otherRunId, caseName: 'Other', prompt: 'saved', expectedResult: 'answer', position: 0, chatRef: '338', startedAt: finishedAt },
    ])
    async function readResults(id: string) {
      return getDb().select().from(testRunResults).where(eq(testRunResults.runId, id)).orderBy(testRunResults.position)
    }
    const originalResults = await readResults(runId)
    const otherResults = await readResults(otherRunId)
    const otherRun = (await getDb().select().from(testRuns).where(eq(testRuns.id, otherRunId)))[0]
    const stopped = await request('POST', `/test-runs/${runId}/stop`)
    expect(stopped.status).toBe(200)
    expect((await stopped.json()).data).toMatchObject({ id: runId, status: 'stopped', error: 'Run stopped by user.' })
    expect((await getDb().select().from(testRuns).where(eq(testRuns.id, runId)))[0]).toMatchObject({ status: 'stopped', error: 'Run stopped by user.' })
    const results = await readResults(runId)
    expect(results.slice(0, 2)).toEqual(originalResults.slice(0, 2))
    expect(results.slice(2).map(({ verdict, error }) => ({ verdict, error }))).toEqual([
      { verdict: 'FAIL', error: 'Run stopped by user.' },
      { verdict: 'FAIL', error: 'Run stopped by user.' },
    ])
    expect(results.every(({ finishedAt }) => finishedAt !== null)).toBe(true)
    expect(results[2]?.startedAt).toBe(originalResults[2]?.startedAt)
    expect(runnerMock.stoppedChatRefs.sort()).toEqual(['101', '102', '337'])
    expect(runnerMock.prompts).toEqual([])
    expect(await readResults(otherRunId)).toEqual(otherResults)
    expect((await getDb().select().from(testRuns).where(eq(testRuns.id, otherRunId)))[0]).toEqual(otherRun)
  })

  it('closes an abandoned run as failed when its remote chats cannot be stopped', async () => {
    const setId = await createSet(`Abandoned stop failure ${testId('set')}`)
    const run = (await getDb().insert(testRuns).values({ setId, name: 'Abandoned', setName: 'Snapshot', status: 'running' }).returning())[0]
    if (!run) throw new Error('The run fixture could not be saved.')
    await getDb().insert(testRunResults).values({ runId: run.id, caseName: 'Stuck', prompt: 'saved', expectedResult: 'answer', position: 0, chatRef: '337' })
    runnerMock.cancellationError = 'Remote cancellation failed.'
    const response = await request('POST', `/test-runs/${run.id}/stop`)
    expect(response.status).toBe(502)
    const savedRun = (await getDb().select().from(testRuns).where(eq(testRuns.id, run.id)))[0]
    expect(savedRun).toMatchObject({ status: 'failed', error: 'Remote cancellation failed.' })
    expect(savedRun?.finishedAt).not.toBeNull()
    const savedResult = (await getDb().select().from(testRunResults).where(eq(testRunResults.runId, run.id)))[0]
    expect(savedResult).toMatchObject({ verdict: 'FAIL', error: 'Remote cancellation failed.' })
    expect(savedResult?.finishedAt).not.toBeNull()
  })

  it('saves only complete case orders and appends new cases', async () => {
    const setId = await createSet(`Order ${testId('set')}`)
    const otherSetId = await createSet(`Foreign ${testId('set')}`)
    const caseIds: string[] = []

    for (const name of ['First case', 'Second case', 'Third case']) {
      const response = await request('POST', `/test-sets/${setId}/cases`, {
        name,
        prompt: `${name} prompt`,
        expectedResult: `${name} expected`,
      })
      expect(response.status).toBe(201)
      caseIds.push(testCaseSelectSchema.parse((await response.json()).data).id)
    }

    const foreignCaseResponse = await request('POST', `/test-sets/${otherSetId}/cases`, {
      name: 'Foreign case',
      prompt: 'Foreign prompt',
      expectedResult: 'Foreign expected',
    })
    expect(foreignCaseResponse.status).toBe(201)
    const foreignCaseId = testCaseSelectSchema.parse((await foreignCaseResponse.json()).data).id
    const orderPath = `/test-sets/${setId}/cases/reorder`
    const orderedIds = [caseIds[2], caseIds[0], caseIds[1]]

    const reorderResponse = await request('PATCH', orderPath, { caseIds: orderedIds })
    expect(reorderResponse.status).toBe(200)

    async function readCases() {
      const response = await request('GET', `/test-sets/${setId}/cases`)
      expect(response.status).toBe(200)
      return testCaseSelectSchema.array().parse((await response.json()).data)
    }

    expect((await readCases()).map(({ id }) => id)).toEqual(orderedIds)
    expect((await readCases()).map(({ position }) => position)).toEqual([0, 1, 2])

    async function expectRejectedWithoutChanges(input: { caseIds: string[] }) {
      const response = await request('PATCH', orderPath, input)
      expect(response.status).toBe(400)
      expect((await readCases()).map(({ id }) => id)).toEqual(orderedIds)
    }

    await expectRejectedWithoutChanges({ caseIds: [caseIds[0], caseIds[0], caseIds[2]] })
    await expectRejectedWithoutChanges({ caseIds: [caseIds[0], caseIds[2]] })
    await expectRejectedWithoutChanges({ caseIds: [caseIds[0], caseIds[1], foreignCaseId] })

    const viewOnly = await createSystemSession(['view-test-sets'], 'test-runner-view-only')
    const denied = await request('PATCH', orderPath, { caseIds: orderedIds }, viewOnly.cookie)
    expect(denied.status).toBe(403)
    expect((await readCases()).map(({ id }) => id)).toEqual(orderedIds)

    const deleted = await request('DELETE', `/test-sets/${setId}/cases/${caseIds[0]}`)
    expect(deleted.status).toBe(200)
    const remainingIds = [caseIds[2], caseIds[1]]
    expect((await readCases()).map(({ id }) => id)).toEqual(remainingIds)

    const appendedResponse = await request('POST', `/test-sets/${setId}/cases`, {
      name: 'Appended case',
      prompt: 'Appended prompt',
      expectedResult: 'Appended expected',
    })
    expect(appendedResponse.status).toBe(201)
    const appendedId = testCaseSelectSchema.parse((await appendedResponse.json()).data).id
    const appendedCases = await readCases()
    expect(appendedCases.map(({ id }) => id)).toEqual([...remainingIds, appendedId])
    expect(appendedCases.map(({ position }) => position)).toEqual([0, 2, 3])
  })
})
