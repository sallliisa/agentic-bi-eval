import { spawn, spawnSync } from 'node:child_process'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import chokidar from 'chokidar'
import { isGeneratedPackagePath, packageInputState } from '../../../packages/sprindle/tooling/package-state.mjs'

const apiRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sprindleRoot = resolve(apiRoot, '../../packages/sprindle')
const editorRoot = resolve(sprindleRoot, 'editor')
const extensionsRoot = process.env.SPRINDLE_VSCODE_EXTENSIONS_DIR || join(homedir(), '.vscode', 'extensions')
const debounceMs = 150
const preparationGraceMs = 1500
const preparationKillWaitMs = 3000
const workerGraceMs = 4000
const workerKillWaitMs = 1000
let frameworkInputState = packageInputState(sprindleRoot)
const watcher = chokidar.watch(frameworkInputState.watchPaths, {
  ignoreInitial: true,
  ignored: (path) => isGeneratedPackagePath(sprindleRoot, path),
  persistent: true,
})
const expectedWorkerExits = new Set()
const closedPreparations = new WeakSet()
const stoppingWorkers = new WeakMap()
const editorNotices = new Set()
let worker
let preparation
let debounceTimer
let preparing = false
let starting = true
let stopping = false
let shutdownPromise
let revision = 0

function log(message) {
  process.stdout.write(`[api:dev] ${message}\n`)
}

function waitForCloseWithin(child, timeoutMs) {
  if (!child || child.exitCode !== null || child.signalCode !== null || closedPreparations.has(child)) return Promise.resolve(true)
  return new Promise((resolveClose) => {
    const timer = setTimeout(() => {
      child.off('close', finish)
      resolveClose(false)
    }, timeoutMs)
    function finish() {
      clearTimeout(timer)
      resolveClose(true)
    }
    child.once('close', finish)
  })
}

function processGroupIsAlive(pid) {
  try {
    process.kill(-pid, 0)
    return true
  } catch (error) {
    return error?.code !== 'ESRCH'
  }
}

async function waitForProcessGroupToStop(pid, timeoutMs) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (!processGroupIsAlive(pid)) return true
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 50))
  }
  return !processGroupIsAlive(pid)
}

async function stopPreparationTree(child, signal) {
  if (!child) return
  if (!child.pid) {
    if (!await waitForCloseWithin(child, preparationKillWaitMs)) throw new Error('The Sprindle preparation process did not close after startup failed.')
    return
  }
  if (process.platform === 'win32') {
    const result = spawnSync('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], {
      stdio: 'ignore',
      windowsHide: true,
      timeout: preparationKillWaitMs,
    })
    if (result.error) throw new Error('Cannot stop the Sprindle preparation process tree.', { cause: result.error })
    if (result.status !== 0 && !await waitForCloseWithin(child, preparationGraceMs)) throw new Error(`Cannot stop the Sprindle preparation process tree (taskkill exited ${result.status}).`)
    if (!await waitForCloseWithin(child, preparationKillWaitMs)) throw new Error('The Sprindle preparation process tree did not stop after taskkill.')
    return
  }
  try {
    process.kill(-child.pid, signal ?? 'SIGTERM')
  } catch (error) {
    if (error?.code !== 'ESRCH') throw error
  }
  if (!await waitForProcessGroupToStop(child.pid, preparationGraceMs)) {
    try {
      process.kill(-child.pid, 'SIGKILL')
    } catch (error) {
      if (error?.code !== 'ESRCH') throw error
    }
    if (!await waitForProcessGroupToStop(child.pid, preparationKillWaitMs)) throw new Error('The Sprindle preparation process group did not stop after SIGKILL.')
  }
  if (!await waitForCloseWithin(child, preparationKillWaitMs)) throw new Error('The Sprindle preparation process did not close after its process group stopped.')
}

function waitForQuiet() {
  if (!debounceTimer) return Promise.resolve()
  return new Promise((resolveQuiet) => {
    const check = () => {
      if (debounceTimer) setTimeout(check, debounceMs)
      else resolveQuiet()
    }
    setTimeout(check, debounceMs)
  })
}

function settlePendingChanges() {
  revision += 1
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    debounceTimer = undefined
    if (!starting && !preparing && !stopping) void prepareReplacement()
  }, debounceMs)
}

watcher.on('all', (event, path) => {
  if (!['add', 'change', 'unlink'].includes(event)) return
  if (isGeneratedPackagePath(sprindleRoot, path)) return
  log(`Framework input changed: ${path}`)
  settlePendingChanges()
})
watcher.on('error', (error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`)
})

function runPreparation() {
  return new Promise((resolvePreparation) => {
    const child = spawn(process.execPath, ['scripts/ensure-tooling.mjs'], { cwd: apiRoot, stdio: 'inherit', detached: process.platform !== 'win32' })
    preparation = child
    let settled = false
    const finish = (status) => {
      if (settled) return
      settled = true
      if (preparation === child) preparation = undefined
      resolvePreparation(status)
    }
    child.once('error', (error) => {
      process.stderr.write(`${error.stack ?? error.message}\n`)
      finish(1)
    })
    child.once('close', (status, signal) => {
      closedPreparations.add(child)
      finish(signal ? 1 : status ?? 1)
    })
  })
}

async function refreshWatchPaths() {
  const state = packageInputState(sprindleRoot)
  const addedPaths = state.watchPaths.filter((path) => !frameworkInputState.watchPaths.includes(path))
  const removedPaths = frameworkInputState.watchPaths.filter((path) => !state.watchPaths.includes(path))
  if (removedPaths.length > 0) await watcher.unwatch(removedPaths)
  if (addedPaths.length > 0) await watcher.add(addedPaths)
  frameworkInputState = state
}

async function checkEditor() {
  let message
  let state = frameworkInputState.fingerprint
  try {
    const { checkEditorInstallation, editorCheckMessage, editorInputState } = await import('../../../packages/sprindle/editor/state.mjs')
    const result = checkEditorInstallation(editorRoot, extensionsRoot, () => editorInputState(editorRoot, frameworkInputState))
    message = editorCheckMessage(result)
    state = result.fingerprint ?? state
  } catch {
    message = 'Could not verify the installed Sprindle VS Code extension (comparison failed). Run pnpm setup:editor.'
  }
  if (!message) return
  const key = `${state}:${message}`
  if (editorNotices.has(key)) return
  editorNotices.add(key)
  process.stdout.write(`[sprindle:editor] ${message}\n`)
}

function startWorker() {
  if (stopping) return undefined
  log('Starting TypeScript development worker...')
  const child = spawn(process.execPath, ['--import', 'tsx', 'scripts/dev.ts'], { cwd: apiRoot, detached: process.platform !== 'win32', stdio: 'inherit' })
  worker = child
  child.once('error', (error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`)
    void shutdown(1)
  })
  child.once('close', (status, signal) => {
    if (worker === child) worker = undefined
    if (expectedWorkerExits.delete(child) || stopping) return
    void shutdown(signal ? 1 : status ?? 1)
  })
  return child
}

async function stopWorker(child, signal) {
  const stopping = stoppingWorkers.get(child)
  if (stopping) return stopping
  expectedWorkerExits.add(child)
  const stopStarted = Date.now()
  const task = (async () => {
    try {
      if (child.exitCode === null && child.signalCode === null) {
        if (process.platform === 'win32') {
          if (!child.pid) {
            if (!await waitForCloseWithin(child, workerKillWaitMs)) throw new Error('The API development worker did not close after startup failed.')
          } else {
            const result = spawnSync('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true, timeout: workerKillWaitMs })
            if (result.error && result.error.code !== 'ESRCH') throw new Error('Cannot stop the API development worker tree with taskkill.exe.', { cause: result.error })
            if (result.status !== 0 && child.exitCode === null && child.signalCode === null) throw new Error('The API development worker tree did not stop with taskkill.exe.')
          }
        } else {
          const deadline = Date.now() + workerGraceMs + workerKillWaitMs
          const remaining = () => Math.max(0, deadline - Date.now())
          try { process.kill(-child.pid, signal ?? 'SIGTERM') } catch (error) { if (error?.code !== 'ESRCH') throw error }
          if (!await waitForProcessGroupToStop(child.pid, Math.min(workerGraceMs, remaining()))) {
            try { process.kill(-child.pid, 'SIGKILL') } catch (error) { if (error?.code !== 'ESRCH') throw error }
            if (!await waitForProcessGroupToStop(child.pid, remaining())) throw new Error('The API development worker process group did not stop after SIGKILL.')
          }
        }
      }
      const closeTimeout = process.platform === 'win32' ? workerKillWaitMs : Math.max(0, workerGraceMs + workerKillWaitMs - (Date.now() - stopStarted))
      if (!await waitForCloseWithin(child, closeTimeout)) throw new Error('The API development worker did not close after its process tree stopped.')
    } finally {
      expectedWorkerExits.delete(child)
      if (worker === child) worker = undefined
    }
  })()
  stoppingWorkers.set(child, task)
  return task
}

async function prepareUntilStable() {
  while (!stopping) {
    const before = revision
    const status = await runPreparation()
    if (stopping) return 1
    if (revision !== before) {
      await waitForQuiet()
      continue
    }
    if (status === 0) await refreshWatchPaths()
    return { status, revision: before }
  }
  return { status: 1, revision }
}

async function prepareReplacement() {
  if (preparing || starting || stopping) return
  preparing = true
  let handledRevision = revision
  try {
    while (!stopping) {
      const before = revision
      handledRevision = before
      log('Preparing current Sprindle tooling...')
      const status = await runPreparation()
      if (stopping) return
      if (revision !== before) {
        await waitForQuiet()
        continue
      }
      if (status !== 0) {
        log('Preparation failed; the active worker remains running.')
        return
      }
      await refreshWatchPaths()
      if (revision !== before) {
        await waitForQuiet()
        continue
      }
      await checkEditor()
      if (revision !== before) {
        await waitForQuiet()
        continue
      }
      const previous = worker
      if (previous) await stopWorker(previous)
      if (stopping) return
      if (revision !== before) {
        startWorker()
        await waitForQuiet()
        continue
      }
      startWorker()
      return
    }
  } catch (error) {
    process.stderr.write(`${error.stack ?? error.message}\n`)
    log('Preparation failed; the active worker remains running.')
  } finally {
    preparing = false
    if (!stopping && !starting && debounceTimer === undefined && revision !== handledRevision) void prepareReplacement()
  }
}

async function shutdown(status, signal) {
  if (shutdownPromise) return shutdownPromise
  stopping = true
  starting = false
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = undefined
  shutdownPromise = (async () => {
    const currentWorker = worker
    const currentPreparation = preparation
    const watcherClose = watcher.close()
    const stops = await Promise.allSettled([
      currentWorker ? stopWorker(currentWorker, signal ?? 'SIGTERM') : Promise.resolve(),
      stopPreparationTree(currentPreparation, signal ?? 'SIGTERM'),
      watcherClose,
    ])
    for (const stopped of stops) {
      if (stopped.status === 'rejected') process.stderr.write(`${stopped.reason?.stack ?? stopped.reason}\n`)
    }
    process.exitCode = signal ? (signal === 'SIGINT' ? 130 : 143) : status
  })()
  return shutdownPromise
}

for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => void shutdown(1, signal))

try {
  await new Promise((resolveReady, rejectReady) => {
    watcher.once('ready', resolveReady)
    watcher.once('error', rejectReady)
  })
  const initial = await prepareUntilStable()
  if (initial.status !== 0 || stopping) {
    await shutdown(initial.status || 1)
  } else {
    await checkEditor()
    startWorker()
    starting = false
    if (!debounceTimer && revision !== initial.revision) void prepareReplacement()
  }
} catch (error) {
  process.stderr.write(`${error.stack ?? error.message}\n`)
  await shutdown(1)
}
