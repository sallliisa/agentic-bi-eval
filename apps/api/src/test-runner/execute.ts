import { HttpError, notFound } from '@southneuhof/sprindle'
import { and, asc, eq, inArray, isNotNull, isNull, ne, sql } from 'drizzle-orm'
import { getDb } from '../db'
import { testCaseSelectSchema } from '../routes/(authenticated)/test-sets/test-cases.schema'
import { testCases } from '../routes/(authenticated)/test-sets/test-cases.table'
import { testSetSelectSchema } from '../routes/(authenticated)/test-sets/test-sets.schema'
import { testSets } from '../routes/(authenticated)/test-sets/test-sets.table'
import { testRunResultSelectSchema } from '../routes/(authenticated)/test-runs/test-runs.schema'
import { testRunResults } from '../routes/(authenticated)/test-runs/test-run-results.table'
import { testRunSelectSchema } from '../routes/(authenticated)/test-runs/test-runs.schema'
import { testRunStartInputSchema } from '../routes/(authenticated)/test-sets/schema'
import { testRuns } from '../routes/(authenticated)/test-runs/test-runs.table'
import { compareExpectedResult } from './compare'
import { createCloudflareOsRunner, stopCloudflareOsChats } from './cloudflare-os'

const activeRuns = new Map<string, { controller: AbortController; finished: Promise<void> }>()
const abandonedStops = new Map<string, Promise<void>>()
const stoppedMessage = 'Run stopped by user.'

function launchTestRun(runId: string, resultIds?: string[]) {
  const controller = new AbortController()
  const finished = executeTestRun(runId, controller.signal, resultIds).finally(() => {
    activeRuns.delete(runId)
  })
  activeRuns.set(runId, { controller, finished })
  void finished.catch(() => undefined)
}

export async function stopTestRun(runId: string) {
  const run = (await getDb().select().from(testRuns).where(eq(testRuns.id, runId)).limit(1))[0]
  if (!run) throw notFound()
  if (run.status !== 'running') throw new HttpError(409, 'test_run_not_running', 'This run is not running.')
  const active = activeRuns.get(runId)
  if (active) {
    active.controller.abort()
    await active.finished
  } else {
    let finished = abandonedStops.get(runId)
    if (!finished) {
      finished = (async () => {
        try {
          const results = await getDb().select({ chatRef: testRunResults.chatRef }).from(testRunResults)
            .where(eq(testRunResults.runId, runId))
          await stopCloudflareOsChats(results.flatMap(({ chatRef }) => chatRef === null ? [] : [chatRef]))
          await finishUnfinishedResults(runId, 'stopped', stoppedMessage)
        } catch (error) {
          await finishUnfinishedResults(runId, 'failed', errorText(error, 'The abandoned run could not be stopped.'))
        }
      })().finally(() => {
        abandonedStops.delete(runId)
      })
      abandonedStops.set(runId, finished)
    }
    await finished
  }
  const stoppedRun = (await getDb().select().from(testRuns).where(eq(testRuns.id, runId)).limit(1))[0]
  if (!stoppedRun) throw notFound()
  if (stoppedRun.status === 'failed') throw new HttpError(502, 'test_run_stop_failed', stoppedRun.error ?? 'The run could not be stopped.')
  if (stoppedRun.status !== 'stopped') throw new HttpError(409, 'test_run_not_running', 'This run finished before it could be stopped.')
  return testRunSelectSchema.parse(stoppedRun)
}

export async function startTestRun(setId: string, actorUserId: string, rawInput: unknown) {
  const input = testRunStartInputSchema.parse(rawInput)
  const savedRun = await getDb().transaction(async (tx) => {
    const setRow = (await tx.select().from(testSets).where(eq(testSets.id, setId)).limit(1))[0]
    if (!setRow) throw notFound()
    const set = testSetSelectSchema.parse(setRow)
    const cases = (await tx.select().from(testCases).where(eq(testCases.setId, setId)).orderBy(asc(testCases.position), asc(testCases.id)))
      .map((row) => testCaseSelectSchema.parse(row))
    if (!cases.length) throw new HttpError(422, 'empty_test_set')

    const now = new Date().toISOString()
    const runRow = (await tx.insert(testRuns).values({
      setId,
      name: input.name || set.name,
      setName: set.name,
      modelId: input.modelId,
      repetitions: input.repetitions,
      status: 'running',
      startedAt: now,
      createdAt: now,
      createdByUserId: actorUserId,
    }).returning())[0]
    if (!runRow) throw new Error('The test run could not be saved.')

    let batch: Array<typeof testRunResults.$inferInsert> = []
    for (const testCase of cases) {
      for (let repetition = 1; repetition <= input.repetitions; repetition += 1) {
        batch.push({
          runId: runRow.id,
          caseName: testCase.name,
          prompt: testCase.prompt,
          expectedResult: testCase.expectedResult,
          position: testCase.position,
          repetition,
        })
        if (batch.length === 250) {
          await tx.insert(testRunResults).values(batch)
          batch = []
        }
      }
    }
    if (batch.length) await tx.insert(testRunResults).values(batch)
    return testRunSelectSchema.parse(runRow)
  })

  launchTestRun(savedRun.id)
  return savedRun
}

export async function retryTestResult(runId: string, resultId: string) {
  const result = await getDb().transaction(async (tx) => {
    const existing = (await tx.select().from(testRunResults).where(and(eq(testRunResults.runId, runId), eq(testRunResults.id, resultId))).limit(1))[0]
    if (!existing) throw notFound()
    const claimed = await tx.update(testRuns).set({ status: 'running', error: null, finishedAt: null })
      .where(and(eq(testRuns.id, runId), ne(testRuns.status, 'running'))).returning({ id: testRuns.id })
    if (!claimed.length) throw new HttpError(409, 'test_run_running', 'Wait for this run to finish before retrying a case.')
    const updated = await tx.update(testRunResults).set({
      actualResponse: null,
      verdict: null,
      error: null,
      chatRef: null,
      startedAt: null,
      finishedAt: null,
    }).where(eq(testRunResults.id, resultId)).returning()
    return testRunResultSelectSchema.parse(updated[0])
  })
  launchTestRun(runId, [resultId])
  return result
}

export async function retryTestRun(runId: string) {
  const run = await getDb().transaction(async (tx) => {
    const claimed = await tx.update(testRuns).set({ status: 'running', error: null, startedAt: new Date().toISOString(), finishedAt: null })
      .where(and(eq(testRuns.id, runId), ne(testRuns.status, 'running'))).returning()
    const updatedRun = claimed[0]
    if (!updatedRun) {
      const existing = await tx.select({ id: testRuns.id }).from(testRuns).where(eq(testRuns.id, runId)).limit(1)
      if (!existing.length) throw notFound()
      throw new HttpError(409, 'test_run_running', 'Wait for this run to finish before refreshing it.')
    }
    await tx.update(testRunResults).set({
      actualResponse: null,
      verdict: null,
      error: null,
      chatRef: null,
      startedAt: null,
      finishedAt: null,
    }).where(eq(testRunResults.runId, runId))
    return testRunSelectSchema.parse(updatedRun)
  })
  launchTestRun(runId)
  return run
}

export async function retryTestRunErrors(runId: string) {
  const { run, resultIds } = await getDb().transaction(async (tx) => {
    const claimed = await tx.update(testRuns).set({ status: 'running', error: null, finishedAt: null })
      .where(and(eq(testRuns.id, runId), ne(testRuns.status, 'running'))).returning()
    const run = claimed[0]
    if (!run) {
      const existing = await tx.select({ id: testRuns.id }).from(testRuns).where(eq(testRuns.id, runId)).limit(1)
      if (!existing.length) throw notFound()
      throw new HttpError(409, 'test_run_running', 'Wait for this run to finish before retrying errors.')
    }
    const results = await tx.update(testRunResults).set({
      actualResponse: null,
      verdict: null,
      error: null,
      chatRef: null,
      startedAt: null,
      finishedAt: null,
    }).where(and(eq(testRunResults.runId, runId), isNotNull(testRunResults.error)))
      .returning({ id: testRunResults.id })
    if (!results.length) throw new HttpError(422, 'no_test_run_errors', 'This run has no execution errors to retry.')
    return { run: testRunSelectSchema.parse(run), resultIds: results.map(({ id }) => id) }
  })
  launchTestRun(runId, resultIds)
  return run
}

function errorText(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback
}

async function finishUnfinishedResults(runId: string, status: 'failed' | 'stopped', message: string) {
  const now = new Date().toISOString()
  await getDb().transaction(async (tx) => {
    const updated = await tx.update(testRuns).set({ status, error: message, finishedAt: now })
      .where(and(eq(testRuns.id, runId), eq(testRuns.status, 'running'))).returning({ id: testRuns.id })
    if (!updated.length) return
    await tx.update(testRunResults).set({
      verdict: 'FAIL',
      error: message,
      startedAt: sql`coalesce(${testRunResults.startedAt}, ${now})`,
      finishedAt: now,
    }).where(and(eq(testRunResults.runId, runId), isNull(testRunResults.verdict)))
  })
}

async function executeTestRun(runId: string, signal: AbortSignal, resultIds?: string[]) {
  let runner: Awaited<ReturnType<typeof createCloudflareOsRunner>> | undefined
  try {
    const runRow = (await getDb().select().from(testRuns).where(eq(testRuns.id, runId)).limit(1))[0]
    if (!runRow) throw notFound()
    const run = testRunSelectSchema.parse(runRow)
    signal.throwIfAborted()
    const batchRunner = await createCloudflareOsRunner(run.modelId, signal)
    runner = batchRunner
    signal.throwIfAborted()
    const results = (await getDb().select().from(testRunResults).where(and(eq(testRunResults.runId, runId), resultIds === undefined ? undefined : inArray(testRunResults.id, resultIds))).orderBy(asc(testRunResults.position), asc(testRunResults.repetition), asc(testRunResults.id)))
      .map((row) => testRunResultSelectSchema.parse(row))

    for (let offset = 0; offset < results.length; offset += run.repetitions) {
      signal.throwIfAborted()
      const batch = results.slice(offset, offset + run.repetitions)
      const outcomes = await Promise.allSettled(batch.map(async (result) => {
        signal.throwIfAborted()
        const startedAt = new Date().toISOString()
        await getDb().update(testRunResults).set({ startedAt }).where(eq(testRunResults.id, result.id))
        try {
          signal.throwIfAborted()
          const actualResponse = await batchRunner.run(result.prompt, async (chatRef) => {
            await getDb().update(testRunResults).set({ chatRef }).where(eq(testRunResults.id, result.id))
          })
          signal.throwIfAborted()
          await getDb().update(testRunResults).set({
            actualResponse,
            verdict: compareExpectedResult(result.expectedResult, actualResponse),
            error: null,
            finishedAt: new Date().toISOString(),
          }).where(eq(testRunResults.id, result.id))
        } catch (error) {
          if (signal.aborted) throw error
          await getDb().update(testRunResults).set({
            actualResponse: null,
            verdict: 'FAIL',
            error: errorText(error, 'The test case failed.'),
            finishedAt: new Date().toISOString(),
          }).where(eq(testRunResults.id, result.id))
        }
      }))
      const failure = outcomes.find((outcome) => outcome.status === 'rejected' && outcome.reason !== signal.reason)
        ?? outcomes.find((outcome) => outcome.status === 'rejected')
      if (failure?.status === 'rejected') throw failure.reason
    }

    signal.throwIfAborted()
    await getDb().update(testRuns).set({ status: 'completed', finishedAt: new Date().toISOString() }).where(and(eq(testRuns.id, runId), eq(testRuns.status, 'running')))
  } catch (error) {
    if (signal.aborted && error === signal.reason) {
      await finishUnfinishedResults(runId, 'stopped', stoppedMessage)
    } else {
      await finishUnfinishedResults(runId, 'failed', errorText(error, 'The test run failed.'))
    }
  } finally {
    runner?.close()
  }
}
