#!/usr/bin/env node
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { assertTestTarget } from '../../../../apps/api/scripts/test-target.mjs'

const require = createRequire(new URL('../../../../apps/api/package.json', import.meta.url))
const { Pool } = require('pg')
const apiRoot = fileURLToPath(new URL('../../../../apps/api/', import.meta.url)).replace(/\/$/, '')
const mode = process.argv[2]
assert.ok(['doctor', 'users'].includes(mode), 'Usage: control.mjs doctor|users')
assert.equal(process.cwd(), apiRoot, 'Run from apps/api with .env and .env.test loaded.')
const target = assertTestTarget()
const base = new URL(process.env.BETTER_AUTH_URL)
assert.equal(base.hostname, '127.0.0.1', 'Use the owned loopback API instance.')
assert.equal(base.port, process.env.API_PORT)
const pid = Number(process.env.VERIFY_API_PID)
assert.ok(Number.isInteger(pid) && pid > 0, 'VERIFY_API_PID must come from the launch shell.')
const emit = (event, fields = {}) => console.log(JSON.stringify({ event, ...fields }))
const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000, query_timeout: 5000 })

async function request(path, status, { method = 'GET', data, cookie } = {}) {
  const response = await fetch(new URL(path, base), {
    method,
    headers: {
      'Content-Type': 'application/json',
      Origin: process.env.APP_ORIGIN,
      ...(cookie ? { Cookie: cookie } : {}),
    },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
    signal: AbortSignal.timeout(10000),
    redirect: 'error',
  })
  emit('http', { method, path, status: response.status })
  assert.equal(response.status, status, `${method} ${path}`)
  return { response, body: await response.json() }
}

async function doctor() {
  const cwd = execFileSync('lsof', ['-a', '-p', String(pid), '-d', 'cwd', '-Fn'], { encoding: 'utf8' })
  assert.ok(cwd.split('\n').includes(`n${apiRoot}`), 'The API PID belongs to another checkout.')
  const listener = execFileSync('lsof', ['-nP', '-a', '-p', String(pid), `-iTCP:${base.port}`, '-sTCP:LISTEN', '-Fp'], { encoding: 'utf8' })
  assert.ok(listener.split('\n').includes(`p${pid}`), 'The API PID does not own the port.')
  assert.equal((await pool.query('select current_database() as name')).rows[0].name, target.database)
  const admin = await pool.query(`select u.id from users u
    join role_assignments a on a.user_id = u.id and a.active
    join roles r on r.id = a.role_id and r.active and r.role_code = 'administrator'
    where u.email = $1 and u.status_code = 'active'`, [process.env.CARTA_ADMIN_EMAIL])
  assert.equal(admin.rowCount, 1, 'Run db:seed:test before driving.')
  assert.ok(process.env.CARTA_ADMIN_PASSWORD, 'Seed administrator password is missing.')
  await request('/health', 200)
  await request('/users/list', 401)
  emit('doctor-pass', { pid, api: base.origin, database: target.database })
}

async function users() {
  const run = `verify-${crypto.randomUUID()}`
  const email = `${run}@example.invalid`
  const roleIds = [`${run}-one`, `${run}-two`]
  const sessionTokens = []
  emit('fixtures', { email, roleIds })
  const signIn = async (address, password) => {
    const result = await request('/api/auth/sign-in/email', 200, { method: 'POST', data: { email: address, password } })
    assert.equal(typeof result.body.token, 'string')
    sessionTokens.push(result.body.token)
    const cookie = result.response.headers.getSetCookie().map((value) => value.split(';')[0]).join('; ')
    assert.ok(cookie, 'Sign-in returned no cookie.')
    return { cookie, token: result.body.token }
  }
  try {
    const admin = await signIn(process.env.CARTA_ADMIN_EMAIL, process.env.CARTA_ADMIN_PASSWORD)
    await pool.query('insert into roles (id, role_code, name) values ($1, $1, $1), ($2, $2, $2)', roleIds)
    const created = await request('/users/create', 201, {
      method: 'POST', cookie: admin.cookie,
      data: { name: 'Verification User', email, password: 'verification-password', roleIds },
    })
    const saved = (await pool.query('select id, name, email, status_code from users where email = $1', [email])).rows
    assert.equal(saved.length, 1)
    const userId = saved[0].id
    assert.equal(created.body.data.id, userId)
    assert.deepEqual(saved[0], { id: userId, name: 'Verification User', email, status_code: 'active' })
    const assignments = await pool.query('select role_id from role_assignments where user_id = $1 and active order by role_id', [userId])
    assert.deepEqual(assignments.rows.map((row) => row.role_id), [...roleIds].sort())
    emit('create-pass', { userId, roleIds })
    await request(`/users/update/${userId}`, 200, { method: 'PATCH', cookie: admin.cookie, data: { name: 'Renamed Verification User' } })
    const edited = await request(`/users/detail/${userId}`, 200, { cookie: admin.cookie })
    assert.equal(edited.body.data.name, 'Renamed Verification User')
    assert.equal(edited.body.data.email, email)
    emit('edit-pass', { userId })
    const initialSessions = (await pool.query('select count(*)::int as count from sessions where user_id = $1', [userId])).rows[0].count
    const first = await signIn(email, 'verification-password')
    const second = await signIn(email, 'verification-password')
    assert.notEqual(first.token, second.token)
    await request('/me', 200, { cookie: first.cookie })
    await request('/me', 200, { cookie: second.cookie })
    assert.equal((await pool.query('select count(*)::int as count from sessions where user_id = $1', [userId])).rows[0].count, initialSessions + 2)
    await request(`/users/update/${userId}`, 200, { method: 'PATCH', cookie: admin.cookie, data: { statusCode: 'non_active' } })
    assert.equal((await pool.query('select status_code from users where id = $1', [userId])).rows[0].status_code, 'non_active')
    assert.equal((await pool.query('select count(*)::int as count from sessions where user_id = $1', [userId])).rows[0].count, 0)
    await request('/me', 401, { cookie: first.cookie })
    await request('/me', 401, { cookie: second.cookie })
    await request('/me', 200, { cookie: admin.cookie })
    emit('revocation-pass', { userId, revokedSessions: initialSessions + 2, administratorUnaffected: true })
  } finally {
    await pool.query('delete from role_assignments where user_id in (select id from users where email = $1)', [email])
    await pool.query('delete from users where email = $1', [email])
    await pool.query('delete from roles where id = any($1::text[])', [roleIds])
    await pool.query('delete from sessions where token = any($1::text[])', [sessionTokens])
    assert.equal((await pool.query('select id from users where email = $1', [email])).rowCount, 0)
    assert.equal((await pool.query('select id from roles where id = any($1::text[])', [roleIds])).rowCount, 0)
    assert.equal((await pool.query('select id from sessions where token = any($1::text[])', [sessionTokens])).rowCount, 0)
    emit('cleanup-pass', { email, roleIds })
  }
}

try {
  await doctor()
  if (mode === 'users') await users()
} catch (error) {
  emit('failure', { message: error.message })
  process.exitCode = 1
} finally {
  await pool.end()
}
