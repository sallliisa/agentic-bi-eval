import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import { once } from 'node:events'
import { get } from 'node:http'
import { createServer } from 'node:http'
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import test from 'node:test'

const repositoryRoot = resolve(import.meta.dirname, '../../..')

function copy(source, target) {
  cpSync(source, target, { recursive: true, dereference: false })
}

async function freePort() {
  const server = createServer()
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Cannot reserve a local test port.')
  await new Promise((resolveClose, rejectClose) => server.close((error) => error ? rejectClose(error) : resolveClose()))
  return address.port
}

function createWorkspace(t, port, serverCloseDelayMs = 0, serverIgnoresTerm = false) {
  const temporaryRoot = mkdtempSync(join(tmpdir(), 'carta-dev-launcher-'))
  const workspaceRoot = realpathSync(temporaryRoot)
  let stopFixture = async () => {}
  t.after(async () => {
    try {
      await stopFixture()
    } finally {
      rmSync(temporaryRoot, { recursive: true, force: true })
    }
  })

  const packageRoot = join(workspaceRoot, 'packages/sprindle')
  const apiRoot = join(workspaceRoot, 'apps/api')
  const counterPath = join(workspaceRoot, '.build-count')
  const delayPath = join(workspaceRoot, '.build-delay')
  const processLogPath = join(workspaceRoot, '.owned-processes')
  const shutdownLogPath = join(workspaceRoot, '.server-shutdowns')
  const runtimeBlockPath = join(workspaceRoot, '.block-runtime-probe')
  const runtimeMarkerPath = join(workspaceRoot, '.runtime-probe')
  const routePath = join(apiRoot, 'src/routes/public/reports/+server.ts')
  const preloadPath = join(workspaceRoot, 'record-builds.mjs')
  const extensionRoot = join(workspaceRoot, '.vscode/extensions')
  const toolingBase = readFileSync(join(repositoryRoot, 'packages/sprindle/src/tooling/index.ts'), 'utf8')
  mkdirSync(join(apiRoot, 'scripts'), { recursive: true })
  mkdirSync(join(apiRoot, 'src/routes'), { recursive: true })
  for (const file of ['package.json', 'pnpm-workspace.yaml', 'pnpm-lock.yaml', 'tsconfig.base.json']) {
    copy(join(repositoryRoot, file), join(workspaceRoot, file))
  }
  mkdirSync(packageRoot, { recursive: true })
  for (const item of ['package.json', 'tsconfig.json', 'src', 'tooling']) {
    copy(join(repositoryRoot, 'packages/sprindle', item), join(packageRoot, item))
  }
  mkdirSync(join(packageRoot, 'editor'), { recursive: true })
  for (const file of ['build.mjs', 'extension.cjs', 'install.mjs', 'package.json', 'state.mjs']) {
    copy(join(repositoryRoot, 'packages/sprindle/editor', file), join(packageRoot, 'editor', file))
  }
  for (const file of ['ensure-tooling.mjs', 'dev-launcher.mjs', 'dev.ts', 'watch-runtime.ts']) {
    copy(join(repositoryRoot, 'apps/api/scripts', file), join(apiRoot, 'scripts', file))
  }
  writeFileSync(join(apiRoot, 'package.json'), '{"name":"fixture-api","type":"module"}\n')
  writeFileSync(join(apiRoot, 'tsconfig.json'), JSON.stringify({ compilerOptions: { strict: true, noEmit: true, target: 'ES2022', module: 'ESNext', moduleResolution: 'Bundler', skipLibCheck: true }, include: ['src/**/*.ts'] }))
  mkdirSync(join(apiRoot, 'src/routes/public/reports'), { recursive: true })
  writeFileSync(routePath, 'export const GET = () => ({ ok: true })\n')
  writeFileSync(join(apiRoot, 'src/server.ts'), [
    "import { createServer } from 'node:http'",
    "import { appendFileSync } from 'node:fs'",
    "import { fixtureValue } from '@southneuhof/sprindle/tooling'",
    "const server = createServer((_request, response) => { response.setHeader('x-worker-pid', String(process.pid)); response.end(fixtureValue) })",
    "appendFileSync(process.env.CARTA_DEV_PROCESS_LOG, JSON.stringify({ role: 'worker', pid: process.pid }) + '\\n')",
    "server.listen(Number(process.env.API_PORT), '127.0.0.1')",
    "const recordShutdown = () => appendFileSync(process.env.CARTA_DEV_SHUTDOWN_LOG, `${process.pid}\\n`)",
    "if (process.env.CARTA_DEV_SERVER_IGNORE_SIGTERM === '1') process.on('SIGTERM', recordShutdown)",
    "else for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { recordShutdown(); setTimeout(() => server.close(), Number(process.env.CARTA_DEV_SERVER_CLOSE_DELAY_MS)) })",
    '',
  ].join('\n'))
  writeFileSync(shutdownLogPath, '')
  writeFileSync(join(packageRoot, 'src/tooling/index.ts'), `${toolingBase}\nexport const fixtureValue = 'before'\n`)
  mkdirSync(join(apiRoot, 'node_modules/@southneuhof'), { recursive: true })
  symlinkSync(join(repositoryRoot, 'packages/sprindle/node_modules'), join(packageRoot, 'node_modules'), 'dir')
  mkdirSync(join(workspaceRoot, 'node_modules'), { recursive: true })
  symlinkSync(join(repositoryRoot, 'node_modules/.pnpm'), join(workspaceRoot, 'node_modules/.pnpm'), 'dir')
  symlinkSync(packageRoot, join(apiRoot, 'node_modules/@southneuhof/sprindle'), 'dir')
  for (const dependency of ['chokidar', 'tsx']) {
    symlinkSync(join(repositoryRoot, 'apps/api/node_modules', dependency), join(apiRoot, 'node_modules', dependency), 'dir')
  }
  writeFileSync(preloadPath, [
    "import { appendFileSync, existsSync, readFileSync, unlinkSync } from 'node:fs'",
    "const command = String(process.argv[1] ?? '').replaceAll('\\\\', '/')",
    "const runtimeProbe = process.execArgv.some((value) => value.includes('sprindle-resolution:'))",
    "const role = command.endsWith('/typescript/bin/tsc') ? 'typescript' : command.endsWith('scripts/ensure-tooling.mjs') ? 'ensure' : command.endsWith('tooling/package.mjs') ? 'package' : command.endsWith('scripts/dev.ts') ? 'api-dev' : command.endsWith('src/server.ts') ? 'api-server' : command.endsWith('/generation-worker.js') ? 'generation' : runtimeProbe ? 'runtime-probe' : undefined",
    "if (role && process.env.CARTA_DEV_PROCESS_LOG) appendFileSync(process.env.CARTA_DEV_PROCESS_LOG, JSON.stringify({ role, pid: process.pid, ppid: process.ppid, command, args: process.argv.slice(2) }) + '\\n')",
    "if (runtimeProbe && process.env.CARTA_DEV_RUNTIME_MARKER) appendFileSync(process.env.CARTA_DEV_RUNTIME_MARKER, JSON.stringify({ pid: process.pid, ppid: process.ppid }) + '\\n')",
    "if (runtimeProbe && process.env.CARTA_DEV_RUNTIME_BLOCK_FILE && existsSync(process.env.CARTA_DEV_RUNTIME_BLOCK_FILE)) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0)",
    "if (command.endsWith('/typescript/bin/tsc') && !process.argv.includes('--listFilesOnly') && process.env.CARTA_DEV_BUILD_COUNT) {",
    "  appendFileSync(process.env.CARTA_DEV_BUILD_COUNT, 'build\\n')",
    "  const delayFile = process.env.CARTA_DEV_BUILD_DELAY_FILE",
    "  if (delayFile && existsSync(delayFile)) { const delay = Number(readFileSync(delayFile, 'utf8')); unlinkSync(delayFile); Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, delay) }",
    '}',
    '',
  ].join('\n'))
  return {
    workspaceRoot,
    packageRoot,
    apiRoot,
    counterPath,
    delayPath,
    processLogPath,
    shutdownLogPath,
    runtimeBlockPath,
    runtimeMarkerPath,
    routePath,
    toolingBase,
    env: {
      ...process.env,
      API_PORT: String(port),
      CARTA_DEV_BUILD_COUNT: counterPath,
      CARTA_DEV_BUILD_DELAY_FILE: delayPath,
      CARTA_DEV_PROCESS_LOG: processLogPath,
      CARTA_DEV_SHUTDOWN_LOG: shutdownLogPath,
      CARTA_DEV_SERVER_CLOSE_DELAY_MS: String(serverCloseDelayMs),
      CARTA_DEV_SERVER_IGNORE_SIGTERM: serverIgnoresTerm ? '1' : '0',
      CARTA_DEV_RUNTIME_BLOCK_FILE: runtimeBlockPath,
      CARTA_DEV_RUNTIME_MARKER: runtimeMarkerPath,
      SPRINDLE_VSCODE_EXTENSIONS_DIR: extensionRoot,
      NODE_OPTIONS: [process.env.NODE_OPTIONS, `--import=${pathToFileURL(preloadPath).href}`].filter(Boolean).join(' '),
    },
    extensionRoot,
    installedEditor: join(extensionRoot, 'southneuhof.sprindle-language-0.0.0'),
    setStopFixture: (callback) => { stopFixture = callback },
  }
}

function installEditorExtension(workspace) {
  const result = spawnSync(process.execPath, ['editor/install.mjs'], {
    cwd: workspace.packageRoot,
    env: { ...process.env, SPRINDLE_VSCODE_EXTENSIONS_DIR: workspace.extensionRoot },
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024,
  })
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || 'The actual editor installer failed.')
}

function writeFixtureValue(workspace, value) {
  writeFileSync(join(workspace.packageRoot, 'src/tooling/index.ts'), `${workspace.toolingBase}\nexport const fixtureValue = '${value}'\n`)
}

function launch(workspace) {
  const child = spawn(process.execPath, ['scripts/dev-launcher.mjs'], { cwd: workspace.apiRoot, detached: process.platform !== 'win32', env: workspace.env, stdio: ['ignore', 'pipe', 'pipe'] })
  let output = ''
  child.stdout.setEncoding('utf8').on('data', (value) => output += value)
  child.stderr.setEncoding('utf8').on('data', (value) => output += value)
  return { child, output: () => output }
}

function ownedProcesses(workspace) {
  if (!existsSync(workspace.processLogPath)) return []
  return readFileSync(workspace.processLogPath, 'utf8').trim().split('\n').filter(Boolean).map((line) => JSON.parse(line))
}

function processIsAlive(pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    return error?.code !== 'ESRCH'
  }
}

function request(port) {
  return new Promise((resolveResponse) => {
    const child = get({ host: '127.0.0.1', port, path: '/health', headers: { connection: 'close' }, timeout: 1000 }, (response) => {
      let body = ''
      response.setEncoding('utf8').on('data', (value) => body += value)
      response.once('end', () => resolveResponse({ body, pid: Number(response.headers['x-worker-pid']) }))
    })
    child.once('error', () => resolveResponse(undefined))
    child.once('timeout', () => child.destroy())
  })
}

async function waitFor(predicate, description, output, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const value = await predicate()
    if (value) return value
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 30))
  }
  throw new Error(`Timed out waiting for ${description}.\n${output()}`)
}

function buildCount(workspace) {
  if (!existsSync(workspace.counterPath)) return 0
  return readFileSync(workspace.counterPath, 'utf8').trim().split('\n').filter(Boolean).length
}

function waitForHttp(port, value, output, previousPid) {
  return waitFor(async () => {
    const response = await request(port)
    return response?.body === value && (previousPid === undefined || response.pid !== previousPid) ? response : undefined
  }, `HTTP response ${value}`, output)
}

function waitForBuildCount(workspace, count, output) {
  return waitFor(() => buildCount(workspace) >= count, `${count} real package build${count === 1 ? '' : 's'}`, output)
}

function waitForProcessesToStop(pids, output, timeoutMs = 5000) {
  return waitFor(() => pids.every((pid) => !processIsAlive(pid)), 'owned processes to stop', output, timeoutMs)
}

async function waitForBlockedProbe(workspace, output) {
  await waitFor(() => existsSync(workspace.runtimeMarkerPath), 'the route resolver to reach the controlled block', output)
  const probe = JSON.parse(readFileSync(workspace.runtimeMarkerPath, 'utf8').trim())
  const ownerPath = join(workspace.apiRoot, '.sprindle/generation.lock/owner.json')
  const owner = JSON.parse(readFileSync(ownerPath, 'utf8'))
  assert.equal(probe.ppid, owner.pid)
  return { probe, owner }
}

function waitForLog(output, text) {
  return waitFor(() => output().includes(text), `launcher log ${text}`, output)
}

function waitForLogCount(output, text, count) {
  return waitFor(() => output().split(text).length - 1 >= count, `${count} launcher logs containing ${text}`, output)
}

async function stopLauncher(child) {
  if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM')
  if (child.exitCode !== null || child.signalCode !== null) return
  await waitForClose(child, 'The development launcher did not stop.')
}

function waitForClose(child, message) {
  return waitForCloseWithin(child, message, 15_000)
}

function waitForCloseWithin(child, message, timeoutMs) {
  if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve()
  return new Promise((resolveClose, rejectClose) => {
    const timer = setTimeout(() => {
      child.off('close', finish)
      rejectClose(new Error(message))
    }, timeoutMs)
    function finish() {
      clearTimeout(timer)
      resolveClose()
    }
    child.once('close', finish)
  })
}

function killOwnedFixtureProcesses(workspace) {
  const processes = ownedProcesses(workspace).reverse()
  for (const { pid, role } of processes) {
    if (role !== 'ensure' && !processIsAlive(pid)) continue
    if (process.platform === 'win32') {
      spawnSync('taskkill.exe', ['/PID', String(pid), '/F'], { stdio: 'ignore', windowsHide: true, timeout: 5000 })
    } else {
      try {
        process.kill(role === 'ensure' ? -pid : pid, 'SIGKILL')
      } catch (error) {
        if (error?.code !== 'ESRCH') throw error
      }
    }
  }
}

function killLauncherTree(child) {
  if (!child.pid) return
  if (process.platform === 'win32') {
    spawnSync('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true, timeout: 5000 })
    return
  }
  try {
    process.kill(-child.pid, 'SIGKILL')
  } catch (error) {
    if (error?.code !== 'ESRCH') throw error
  }
}

function startFixtureLauncher(workspace) {
  const launcher = launch(workspace)
  workspace.setStopFixture(async () => {
    try {
      await stopLauncher(launcher.child)
    } catch (error) {
      process.stderr.write(`Fixture launcher cleanup failed: ${error.stack ?? error}\n${launcher.output()}`)
      killLauncherTree(launcher.child)
      killOwnedFixtureProcesses(workspace)
      if (launcher.child.exitCode === null && launcher.child.signalCode === null) {
        try {
          await waitForCloseWithin(launcher.child, 'The fixture launcher did not close after its process tree was killed.', 5000)
        } catch {
          launcher.child.kill('SIGKILL')
        }
      }
      throw error
    } finally {
      if (launcher.child.exitCode === null && launcher.child.signalCode === null) launcher.child.kill('SIGKILL')
      killOwnedFixtureProcesses(workspace)
    }
  })
  return launcher
}

async function portIsAvailable(port) {
  const server = createServer()
  try {
    server.listen(port, '127.0.0.1')
    await once(server, 'listening')
    await new Promise((resolveClose) => server.close(resolveClose))
    return true
  } catch {
    return false
  }
}

test('framework edits replace the compiler, retain the worker after failure, and close every child', { timeout: 120_000 }, async (t) => {
  const port = await freePort()
  const workspace = createWorkspace(t, port)
  installEditorExtension(workspace)
  writeFixtureValue(workspace, 'stale')
  const launcher = startFixtureLauncher(workspace)

  const initial = await waitForHttp(port, 'stale', launcher.output)
  await waitForLog(launcher.output, 'pnpm setup:editor')
  assert.equal(launcher.output().split('pnpm setup:editor').length - 1, 1)
  assert.equal(buildCount(workspace), 1)
  await waitFor(() => existsSync(join(workspace.apiRoot, '.sprindle-dev/routes.mjs')), 'source route manifest', launcher.output)
  assert.equal(existsSync(join(workspace.apiRoot, '.sprindle/routes.ts')), true)

  const unchangedInput = readFileSync(join(workspace.packageRoot, 'src/tooling/index.ts'), 'utf8')
  writeFileSync(join(workspace.packageRoot, 'src/tooling/index.ts'), unchangedInput)
  await waitForLogCount(launcher.output, 'Framework input changed:', 1)
  await waitForLogCount(launcher.output, 'Starting TypeScript development worker...', 2)
  assert.equal(launcher.output().split('pnpm setup:editor').length - 1, 1)

  writeFileSync(workspace.delayPath, '2500')
  writeFixtureValue(workspace, 'second')
  await waitForBuildCount(workspace, 2, launcher.output)
  writeFixtureValue(workspace, 'third')
  const pendingEdit = await waitForHttp(port, 'third', launcher.output, initial.pid)
  await waitForLogCount(launcher.output, 'pnpm setup:editor', 2)
  assert.equal(buildCount(workspace), 3)
  assert.notEqual(pendingEdit.pid, initial.pid)

  writeFileSync(join(workspace.packageRoot, 'src/tooling/index.ts'), `${workspace.toolingBase}\nconst fixtureValue: string = 5; export { fixtureValue }\n`)
  await waitForBuildCount(workspace, 4, launcher.output)
  await waitForLog(launcher.output, 'Preparation failed; the active worker remains running.')
  const retained = await request(port)
  assert.deepEqual(retained, { body: 'third', pid: pendingEdit.pid })

  writeFixtureValue(workspace, 'recovered')
  const recovered = await waitForHttp(port, 'recovered', launcher.output, pendingEdit.pid)
  assert.equal(buildCount(workspace), 5)
  assert.notEqual(recovered.pid, pendingEdit.pid)

  launcher.child.kill('SIGTERM')
  await waitForClose(launcher.child, `The development launcher did not exit.\n${launcher.output()}`)
  await waitForProcessesToStop(ownedProcesses(workspace).map((entry) => entry.pid), launcher.output)
  assert.equal(await portIsAvailable(port), true)
})

test('shutdown terminates the owned producer tree during a delayed compiler build', { timeout: 30_000 }, async (t) => {
  const port = await freePort()
  const workspace = createWorkspace(t, port)
  writeFileSync(workspace.delayPath, '10000')
  const launcher = startFixtureLauncher(workspace)

  await waitForBuildCount(workspace, 1, launcher.output)
  const active = ownedProcesses(workspace)
  assert.ok(active.some((entry) => entry.role === 'ensure'))
  assert.ok(active.some((entry) => entry.role === 'package'))
  assert.ok(active.some((entry) => entry.role === 'typescript' && !entry.args.includes('--listFilesOnly')))
  assert.ok(existsSync(join(workspace.packageRoot, '.sprindle-package/build-lock')))

  launcher.child.kill('SIGTERM')
  await waitForClose(launcher.child, `The development launcher did not exit.\n${launcher.output()}`)
  await waitForProcessesToStop(active.map((entry) => entry.pid), launcher.output, 5000)
  assert.equal(await portIsAvailable(port), true)
  const metadataEntries = readdirSync(join(workspace.packageRoot, '.sprindle-package'))
  if (process.platform === 'win32') {
    const ownerPath = join(workspace.packageRoot, '.sprindle-package/build-lock/owner.json')
    if (existsSync(ownerPath)) assert.equal(processIsAlive(JSON.parse(readFileSync(ownerPath, 'utf8')).pid), false)
  } else {
    assert.equal(metadataEntries.includes('build-lock'), false)
    assert.equal(metadataEntries.some((entry) => entry.startsWith('stage-') || entry.startsWith('backup-')), false)
  }

  const receiptPath = join(workspace.packageRoot, 'dist-tooling/package-state.json')
  assert.equal(existsSync(receiptPath), false)
  await new Promise((resolveDelay) => setTimeout(resolveDelay, 1000))
  assert.equal(existsSync(receiptPath), false)
})

test('an absent editor installation stays silent while the API starts', { timeout: 30_000 }, async (t) => {
  const port = await freePort()
  const workspace = createWorkspace(t, port)
  const launcher = startFixtureLauncher(workspace)

  await waitForHttp(port, 'before', launcher.output)
  await new Promise((resolveDelay) => setTimeout(resolveDelay, 500))
  assert.equal(existsSync(workspace.extensionRoot), false)
  assert.equal(launcher.output().includes('pnpm setup:editor'), false)
  assert.equal(launcher.output().split('Framework input changed:').length - 1, 0)
  assert.equal(launcher.output().split('Starting TypeScript development worker...').length - 1, 1)
})

test('a denied editor installation read advises and leaves the API running', { skip: process.platform === 'win32' || process.getuid?.() === 0, timeout: 60_000 }, async (t) => {
  const port = await freePort()
  const workspace = createWorkspace(t, port)
  mkdirSync(workspace.installedEditor, { recursive: true })
  chmodSync(workspace.installedEditor, 0)
  const launcher = startFixtureLauncher(workspace)
  try {
    await waitForHttp(port, 'before', launcher.output)
    await waitForLog(launcher.output, 'EACCES')
    await waitForLog(launcher.output, 'pnpm setup:editor')
  } catch (error) {
    process.stderr.write(`Denied editor fixture failed: ${error.stack ?? error}\n${launcher.output()}`)
    throw error
  } finally {
    chmodSync(workspace.installedEditor, 0o755)
  }
})

test('a failed edit during worker shutdown keeps the last prepared response and recovers', { timeout: 120_000 }, async (t) => {
  const port = await freePort()
  const workspace = createWorkspace(t, port, 1800)
  const launcher = startFixtureLauncher(workspace)
  const initial = await waitForHttp(port, 'before', launcher.output)

  writeFixtureValue(workspace, 'last-good')
  await waitForBuildCount(workspace, 2, launcher.output)
  await waitFor(() => readFileSync(workspace.shutdownLogPath, 'utf8').trim().length > 0, 'old server shutdown to begin', launcher.output)
  const shuttingDown = await request(port)
  assert.equal(shuttingDown?.body, 'before')

  writeFileSync(join(workspace.packageRoot, 'src/tooling/index.ts'), `${workspace.toolingBase}\nconst fixtureValue: string = 5; export { fixtureValue }\n`)
  await waitForLogCount(launcher.output, 'Framework input changed:', 2)
  await waitForBuildCount(workspace, 3, launcher.output)
  await waitForLog(launcher.output, 'Preparation failed; the active worker remains running.')

  const retained = await waitForHttp(port, 'last-good', launcher.output, initial.pid)

  writeFixtureValue(workspace, 'recovered')
  const recovered = await waitForHttp(port, 'recovered', launcher.output, retained.pid)
  assert.equal(buildCount(workspace), 4)
  assert.notEqual(recovered.pid, retained.pid)
})

test('SIGTERM during initial route compilation stops the owned generator before the launcher exits', { timeout: 120_000 }, async (t) => {
  const port = await freePort()
  const workspace = createWorkspace(t, port)
  writeFileSync(workspace.runtimeBlockPath, 'block')
  writeFileSync(workspace.routePath, "import { basename } from 'node:path';export const GET=()=>basename('/reports')\n")
  const launcher = startFixtureLauncher(workspace)
  const { probe, owner } = await waitForBlockedProbe(workspace, launcher.output)
  assert.ok(ownedProcesses(workspace).some((entry) => entry.role === 'api-dev'))

  const started = Date.now()
  launcher.child.kill('SIGTERM')
  await waitForCloseWithin(launcher.child, `The development launcher did not stop within five seconds during initial compilation.\n${launcher.output()}`, 5000)
  assert.ok(Date.now() - started <= 5000)
  const pids = [...new Set([...ownedProcesses(workspace).map((entry) => entry.pid), owner.pid, probe.pid])]
  await waitForProcessesToStop(pids, launcher.output, 5000)
  assert.equal(await portIsAvailable(port), true)
})

test('SIGTERM during a blocked route edit stops the generator, probe, and API server', { timeout: 120_000 }, async (t) => {
  const port = await freePort()
  const workspace = createWorkspace(t, port)
  const launcher = startFixtureLauncher(workspace)
  const initial = await waitForHttp(port, 'before', launcher.output)
  assert.ok(ownedProcesses(workspace).some((entry) => entry.role === 'api-server' && entry.pid === initial.pid))

  writeFileSync(workspace.runtimeBlockPath, 'block')
  writeFileSync(workspace.routePath, "import { basename } from 'node:path';export const GET=()=>basename('/reports')\n")
  const { probe, owner } = await waitForBlockedProbe(workspace, launcher.output)
  assert.notEqual(owner.pid, initial.pid)
  const started = Date.now()
  launcher.child.kill('SIGTERM')
  await waitForCloseWithin(launcher.child, `The development launcher did not stop within five seconds during route reload.\n${launcher.output()}`, 5000)
  assert.ok(Date.now() - started <= 5000)
  const pids = [...new Set([...ownedProcesses(workspace).map((entry) => entry.pid), owner.pid, probe.pid, initial.pid])]
  await waitForProcessesToStop(pids, launcher.output, 5000)
  await new Promise((resolveDelay) => setTimeout(resolveDelay, 300))
  assert.equal(ownedProcesses(workspace).filter((entry) => entry.role === 'api-server').length, 1)
  assert.equal(await portIsAvailable(port), true)
})

test('an owned API server that ignores SIGTERM is force stopped within the shutdown bound', { timeout: 120_000 }, async (t) => {
  const port = await freePort()
  const workspace = createWorkspace(t, port, 0, true)
  const launcher = startFixtureLauncher(workspace)
  const initial = await waitForHttp(port, 'before', launcher.output)

  launcher.child.kill('SIGTERM')
  await waitForCloseWithin(launcher.child, `The development launcher did not stop after the API server ignored SIGTERM.\n${launcher.output()}`, 5000)
  const pids = [...new Set([...ownedProcesses(workspace).map((entry) => entry.pid), initial.pid])]
  await waitForProcessesToStop(pids, launcher.output, 5000)
  assert.ok(readFileSync(workspace.shutdownLogPath, 'utf8').split('\n').includes(String(initial.pid)))
  assert.equal(await portIsAvailable(port), true)
})
