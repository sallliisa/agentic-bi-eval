import { createRequire } from 'node:module'
import { readFile, readdir, writeFile } from 'node:fs/promises'

const require = createRequire(new URL('../../apps/api/package.json', import.meta.url))
const { Client } = require('pg')
const api = await import('../../apps/api/src/cloudflare-os/management.ts')
const runner = await import('../../apps/api/src/test-runner/execute.ts')
const packagePath = new URL('./package/', import.meta.url)
const db = new Client({ connectionString: process.env.DATABASE_URL })
const initialRunId = 'fc74c650-4320-4a14-81b9-f290dad69014'
const setId = 'ebb5c42f-0a27-458a-a970-7d8c95a679ff'
const models = [
  { id: 'muse-spark-1.3-contributor-variant-4ddfa039f9b7', name: 'Muse Spark 1.3', runName: 'Muse Spark 1.3 NATURAL-REVISED; WITH business context' },
  { id: 'deepseek-v4-vik', name: 'DeepSeek v4', runName: 'DeepSeek v4 NATURAL-REVISED; WITH business context' },
]
const log = (event, data = {}) => console.log(JSON.stringify({ at: new Date().toISOString(), event, ...data }))
const sleep = () => new Promise((resolve) => setTimeout(resolve, 30 * 60 * 1000))

async function runStatus(runId) {
  const { rows } = await db.query(`
    SELECT r.id, r.name, r.status, r.error, r.repetitions,
      count(x.id)::int AS attempts,
      count(*) FILTER (WHERE x.error IS NOT NULL)::int AS attempt_errors,
      count(*) FILTER (WHERE x.finished_at IS NULL)::int AS unfinished,
      count(DISTINCT x.case_name)::int AS cases,
      count(*) FILTER (WHERE x.verdict = 'FAIL')::int AS failed_verdicts
    FROM test_runs r
    LEFT JOIN test_run_results x ON x.run_id = r.id
    WHERE r.id = $1
    GROUP BY r.id
  `, [runId])
  return rows[0]
}

function requireClean(run, expectedAttempts) {
  if (!run) throw new Error('Expected run record is missing')
  if (run.status === 'running') return false
  if (run.status !== 'completed') throw new Error(`Run ended with status ${run.status}: ${run.error ?? 'no run error text'}`)
  if (run.error !== null || run.attempt_errors > 0) throw new Error('Run contains one or more run-level or case-attempt errors')
  if (run.attempts !== expectedAttempts || run.unfinished !== 0) throw new Error('Run ended without all expected case repetitions finishing')
  return true
}

async function waitForCleanRun(runId, expectedAttempts) {
  let retryCycles = 0
  while (true) {
    await sleep()
    const status = await runStatus(runId)
    log('run-check', status)
    if (status?.status !== 'running' && status?.attempt_errors > 0 && retryCycles < 2) {
      await runner.retryTestRunErrors(runId)
      retryCycles += 1
      log('error-attempts-retried', { runId, retryCycle: retryCycles, errors: status.attempt_errors })
      continue
    }
    if (requireClean(status, expectedAttempts)) return status
  }
}

async function uploadContext() {
  const existing = await api.listContextCollections()
  const title = 'HKA TROM Business Context — revised for Natural Revised evaluation'
  const found = existing.data.find((item) => item.title === title)
  const collection = found ?? await api.createContextCollection({
    title,
    description: 'General business terminology, relationships, and reporting rules for HKA TROM operational analysis.',
    visibility: 'private',
  })
  log(found ? 'context-resumed' : 'context-created', { id: collection.id, title: collection.title })
  const skillText = await readFile(new URL('SKILL.md', packagePath), 'utf8')
  const skillBody = skillText.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n\r?\n/, '')
  const skillName = 'hka-trom-business-context'
  const skillDescription = 'Interpret HKA TROM operational data and analytical requests.'
  const referencesPath = new URL('references/', packagePath)
  const files = (await readdir(referencesPath)).filter((file) => file.endsWith('.md')).sort()
  const expectedSkill = `---\nname: ${JSON.stringify(skillName)}\ndescription: ${JSON.stringify(skillDescription)}\n---\n\n${skillBody}`
  const expectedBodies = new Map([['SKILL.md', expectedSkill]])
  for (const file of files) {
    expectedBodies.set(`references/${file}`, await readFile(new URL(file, referencesPath), 'utf8'))
  }
  const listed = await api.listContextDocuments(collection.id)
  const existingPaths = new Set(listed.data.map((item) => item.path))
  for (const [path, body] of expectedBodies) {
    if (existingPaths.has(path)) continue
    if (path === 'SKILL.md') await api.createContextItem(collection.id, {
      kind: 'skill', path, name: skillName,
      description: skillDescription, body: skillBody,
    })
    else await api.createContextItem(collection.id, {
      kind: 'document', path,
      description: `HKA TROM ${path.split('/').at(-1).replace(/\.md$/, '')} business definitions.`, body,
    })
  }
  const [documents, collections] = await Promise.all([
    api.listContextDocuments(collection.id),
    api.listContextCollections(),
  ])
  const expectedPaths = ['SKILL.md', ...files.map((file) => `references/${file}`)].sort()
  const actualPaths = documents.data.map((item) => item.path).sort()
  if (JSON.stringify(actualPaths) !== JSON.stringify(expectedPaths)) throw new Error('Uploaded context document list differs from package')
  if (!collections.data.some((item) => item.id === collection.id)) throw new Error('Uploaded context collection is not enabled for this account')
  for (const path of expectedPaths) {
    const saved = await api.getContextDocument(collection.id, path)
    const expected = expectedBodies.get(path)
    if (saved.body !== expected) throw new Error(`Context document readback differs: ${path}`)
  }
  log('context-verified', { id: collection.id, documents: actualPaths.length, enabled: true })
  return collection.id
}

await db.connect()
try {
  const initial = await runStatus(initialRunId)
  if (!initial || initial.status !== 'running') {
    if (!requireClean(initial, 45)) throw new Error('Initial run is not in a waitable state')
  } else {
    log('waiting-for-initial-run', initial)
    await waitForCleanRun(initialRunId, 45)
  }
  const initialDetails = await db.query('SELECT created_by_user_id FROM test_runs WHERE id=$1', [initialRunId])
  const actorUserId = initialDetails.rows[0]?.created_by_user_id
  if (!actorUserId) throw new Error('Cannot identify the authorized run owner')
  const set = await db.query('SELECT name,(SELECT count(*)::int FROM test_cases WHERE set_id=test_sets.id) AS cases FROM test_sets WHERE id=$1', [setId])
  if (!set.rows[0] || set.rows[0].cases !== 15) throw new Error('Accepted test set is missing or does not contain 15 cases')
  const collectionId = await uploadContext()
  for (const model of models) {
    const available = await api.listModels()
    if (!available.data.some((item) => item.id === model.id && item.name.toLowerCase() === model.name.toLowerCase())) throw new Error(`Model is not available: ${model.name}`)
    const run = await runner.startTestRun(setId, actorUserId, { name: model.runName, modelId: model.id, repetitions: 3 })
    log('run-started', { id: run.id, name: run.name, model: model.name, repetitions: run.repetitions, collectionId })
    const status = await waitForCleanRun(run.id, 45)
    log('run-clean', { id: run.id, name: run.name, passes: 45 - status.failed_verdicts, failedVerdicts: status.failed_verdicts })
  }
  await writeFile(new URL('workflow-complete.json', import.meta.url), JSON.stringify({ initialRunId, setId, collectionId, runs: models.map(({ name, runName, id }) => ({ name, runName, modelId: id, repetitions: 3, status: 'completed' })) }, null, 2) + '\n', { flag: 'wx' })
  log('workflow-complete')
} catch (error) {
  log('workflow-stopped', { error: error instanceof Error ? error.message : String(error) })
  process.exitCode = 1
} finally {
  await db.end()
}
