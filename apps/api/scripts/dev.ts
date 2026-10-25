import { spawn, type ChildProcess } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { watchRouteManifest } from '@southneuhof/sprindle/tooling'
import { watchRuntime, type RuntimeWatcher } from './watch-runtime'

const projectRoot = fileURLToPath(new URL('..', import.meta.url))
const manifest = '.sprindle-dev/routes.mjs'
const bootStarted = Date.now()
const generationAbort = new AbortController()
const serverStopGraceMs = 2_000
const serverStopWaitMs = 2_500
const log = (message: string) => console.log(`[api:dev] ${message} (+${Date.now() - bootStarted}ms)`)
log('Compiling file routes and starting route watcher...')

let server: ChildProcess | undefined
let watcher: Awaited<ReturnType<typeof watchRouteManifest>> | undefined
let runtimeWatcher: RuntimeWatcher | undefined
let restartTimer: ReturnType<typeof setTimeout> | undefined
let restartTask: Promise<void> | undefined
let shutdown: Promise<void> | undefined
let requestedRevision = 0
let completedRevision = 0
let stopping = false
let ready = false
const closedServers = new WeakSet<ChildProcess>()
const expectedServerStops = new WeakSet<ChildProcess>()

function waitForExitWithin(child: ChildProcess, timeoutMs: number) {
  if (closedServers.has(child)) return Promise.resolve(true)
  return new Promise<boolean>((resolve) => {
    const timer = setTimeout(() => {
      child.off('close', finish)
      resolve(false)
    }, timeoutMs)
    function finish() {
      clearTimeout(timer)
      resolve(true)
    }
    child.once('close', finish)
  })
}

async function closeWatchers() {
  const route = watcher
  const runtime = runtimeWatcher
  watcher = undefined
  runtimeWatcher = undefined
  await Promise.all([route?.close(), runtime?.close()].filter((value) => value !== undefined))
}

function startServer() {
  if (stopping) return undefined
  log('Starting API server...')
  const child = spawn(process.execPath, ['--import', 'tsx', '--env-file-if-exists=.env', 'src/server.ts'], { stdio: 'inherit', env: { ...process.env, SPRINDLE_ROUTE_MANIFEST: manifest } })
  server = child
  child.once('error', (error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`)
    if (server === child) server = undefined
  })
  child.once('close', (code, signal) => {
    closedServers.add(child)
    if (server === child) server = undefined
    if (stopping || expectedServerStops.has(child)) return
    log(`API server exited (${signal ?? code ?? 1}); waiting for a source change.`)
  })
  return child
}

function waitForStart(child: ChildProcess) {
  if (child.pid !== undefined || closedServers.has(child)) return Promise.resolve()
  return new Promise<void>((resolve) => {
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      child.off('spawn', finish)
      child.off('error', finish)
      child.off('close', finish)
      resolve()
    }
    child.once('spawn', finish)
    child.once('error', finish)
    child.once('close', finish)
  })
}

async function restartLoop() {
  while (!stopping && completedRevision < requestedRevision) {
    const revision = requestedRevision
    const current = server
    if (current) {
      expectedServerStops.add(current)
      await stopServer(current)
    }
    if (stopping) return
    if (revision !== requestedRevision) continue
    const next = startServer()
    if (!next) return
    completedRevision = revision
    await waitForStart(next)
  }
}

function startRestartLoop() {
  if (restartTask || stopping) return
  const task = restartLoop().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`)
    completedRevision = requestedRevision
  })
  restartTask = task
  void task.finally(() => {
    if (restartTask === task) restartTask = undefined
    if (!stopping && !restartTimer && completedRevision < requestedRevision) startRestartLoop()
  })
}

function requestRestart() {
  if (stopping) return
  requestedRevision += 1
  if (restartTimer) clearTimeout(restartTimer)
  restartTimer = setTimeout(() => {
    restartTimer = undefined
    startRestartLoop()
  }, 120)
}

async function stopServer(child: ChildProcess, signal: NodeJS.Signals = 'SIGTERM') {
  expectedServerStops.add(child)
  if (child.exitCode !== null || child.signalCode !== null || closedServers.has(child)) return
  child.kill(signal)
  if (await waitForExitWithin(child, serverStopGraceMs)) return
  child.kill('SIGKILL')
  if (!await waitForExitWithin(child, serverStopWaitMs)) throw new Error(`The owned API server process ${child.pid ?? 'without a pid'} did not stop after SIGKILL.`)
}

function finish(code: number, signal?: NodeJS.Signals) {
  if (shutdown) return shutdown
  stopping = true
  generationAbort.abort(new Error(`API development shutdown started with status ${code}.`))
  if (restartTimer) clearTimeout(restartTimer)
  restartTimer = undefined
  const watcherClose = closeWatchers()
  const current = server
  const serverClose = current ? stopServer(current, signal ?? 'SIGTERM') : Promise.resolve()
  shutdown = (async () => {
    const initial = initialization?.catch(() => {})
    const results = await Promise.allSettled([watcherClose, serverClose, initial, restartTask])
    const failures = results.flatMap((result) => result.status === 'rejected' ? [result.reason] : [])
    for (const error of failures) process.stderr.write(`${error?.stack ?? error}\n`)
    try { await closeWatchers() } catch (error) { failures.push(error); process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`) }
    const remaining = server
    if (remaining) {
      try { await stopServer(remaining, signal ?? 'SIGTERM') } catch (error) { failures.push(error); process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`) }
    }
    process.exitCode = signal ? code : failures.length ? 1 : code
  })()
  return shutdown
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => { void finish(signal === 'SIGINT' ? 130 : 143, signal) })

async function initialize() {
  watcher = await watchRouteManifest(projectRoot, 'src/routes', (error) => {
    if (error) {
      process.stderr.write(`${error.stack ?? error.message}\n`)
      return
    }
    if (ready) requestRestart()
  }, manifest, false, { signal: generationAbort.signal })
  if (stopping) {
    await closeWatchers()
    return
  }
  runtimeWatcher = watchRuntime(projectRoot, (file) => {
    if (watcher?.hasInput(file)) return
    requestRestart()
  }, (error) => process.stderr.write(`${error.stack ?? error.message}\n`))
  await runtimeWatcher.ready
  if (stopping) {
    await closeWatchers()
    return
  }
  log('Route and runtime watchers ready.')
  ready = true
  startServer()
}

const initialization = initialize()
try {
  await initialization
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`)
  await finish(1)
}
