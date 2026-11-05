import { createRequire } from 'node:module'

const require = createRequire(new URL('../../apps/api/package.json', import.meta.url))
const { Client } = require('pg')
const runId = process.argv[2]
if (!runId) throw new Error('Run ID is required')
const client = new Client({ connectionString: process.env.DATABASE_URL })
await client.connect()
try {
  while (true) {
    await new Promise((resolve) => setTimeout(resolve, 30 * 60 * 1000))
    await client.query('BEGIN READ ONLY')
    const result = await client.query(`
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
    await client.query('COMMIT')
    const run = result.rows[0]
    if (!run) throw new Error('Run no longer exists')
    console.log(JSON.stringify(run))
    if (run.error !== null || run.attempt_errors > 0 || run.status === 'failed' || run.status === 'stopped') break
    if (run.status !== 'running') break
  }
} finally {
  await client.end()
}
