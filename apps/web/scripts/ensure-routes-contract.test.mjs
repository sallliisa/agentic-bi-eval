import { strict as assert } from 'node:assert'
import { spawnSync } from 'node:child_process'
import { cpSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, renameSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join, relative, resolve, sep } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { after, test } from 'node:test'

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = resolve(webRoot, '../..')
const typescriptCompiler = createRequire(join(webRoot, 'package.json')).resolve('typescript/bin/tsc')
const vueTypeScriptCompiler = createRequire(join(webRoot, 'package.json')).resolve('vue-tsc/bin/vue-tsc.js')
const temporaryRoots = []

function put(path, content) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, content)
}

function parseJsonc(source) {
  return JSON.parse(source.replace(/,\s*([}\]])/g, '$1'))
}

function fixture(conflictingAlias = false, typeOnlyAliasConflict = false) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'ensure-routes-contract-')))
  temporaryRoots.push(root)
  for (const file of ['package.json', 'pnpm-workspace.yaml', 'pnpm-lock.yaml', 'tsconfig.base.json', '.npmrc']) {
    const source = join(repoRoot, file)
    if (existsSync(source)) copyFileSync(source, join(root, file))
  }
  const workspaceConfig = join(root, 'pnpm-workspace.yaml')
  writeFileSync(workspaceConfig, `${readFileSync(workspaceConfig, 'utf8')}\nverifyDepsBeforeRun: false\n`)

  const sprindleSource = join(repoRoot, 'packages/sprindle')
  const sprindleRoot = join(root, 'packages/sprindle')
  cpSync(sprindleSource, sprindleRoot, {
    recursive: true,
    filter: (source) =>
      !relative(sprindleSource, source)
        .split(sep)
        .some((part) => ['node_modules', '.git', '.sprindle-package', 'dist-tooling', 'dist-types'].includes(part)),
  })
  symlinkSync(join(sprindleSource, 'node_modules'), join(sprindleRoot, 'node_modules'), 'dir')

  const apiRoot = join(root, 'apps/api')
  mkdirSync(apiRoot, { recursive: true })
  copyFileSync(join(repoRoot, 'apps/api/package.json'), join(apiRoot, 'package.json'))
  copyFileSync(join(repoRoot, 'apps/api/tsconfig.json'), join(apiRoot, 'tsconfig.json'))
  if (conflictingAlias || typeOnlyAliasConflict) {
    const apiConfig = parseJsonc(readFileSync(join(apiRoot, 'tsconfig.json'), 'utf8'))
    if (conflictingAlias || typeOnlyAliasConflict) apiConfig.compilerOptions.paths['@domain/*'] = ['./src/domain/*']
    if (typeOnlyAliasConflict) apiConfig.compilerOptions.paths['@contract/*'] = ['./src/contracts/*']
    writeFileSync(join(apiRoot, 'tsconfig.json'), JSON.stringify(apiConfig))
  }
  mkdirSync(join(apiRoot, 'scripts'), { recursive: true })
  copyFileSync(join(repoRoot, 'apps/api/scripts/ensure-tooling.mjs'), join(apiRoot, 'scripts/ensure-tooling.mjs'))
  cpSync(join(repoRoot, 'apps/api/node_modules'), join(apiRoot, 'node_modules'), { recursive: true })
  const apiSprindle = join(apiRoot, 'node_modules/@southneuhof/sprindle')
  rmSync(apiSprindle, { recursive: true, force: true })
  symlinkSync(sprindleRoot, apiSprindle, 'dir')

  for (const name of ['web']) {
    const packageRoot = join(root, 'apps', name)
    mkdirSync(packageRoot, { recursive: true })
    copyFileSync(join(repoRoot, 'apps', name, 'package.json'), join(packageRoot, 'package.json'))
    for (const configName of ['tsconfig.app.json', 'tsconfig.vitest.json']) copyFileSync(join(repoRoot, 'apps', name, configName), join(packageRoot, configName))
    symlinkSync(join(repoRoot, 'apps', name, 'node_modules'), join(packageRoot, 'node_modules'), 'dir')
  }
  const webConfigPath = join(root, 'apps/web/tsconfig.app.json')
  const webConfig = parseJsonc(readFileSync(webConfigPath, 'utf8'))
  if (conflictingAlias) webConfig.compilerOptions.paths['@domain/*'] = ['./browser/*']
  else if (typeOnlyAliasConflict) webConfig.compilerOptions.paths['@domain/*'] = ['../api/src/domain/*']
  if (typeOnlyAliasConflict) webConfig.compilerOptions.paths['@contract/*'] = ['./browser/contracts/*']
  webConfig.compilerOptions.paths['@southneuhof/sprindle'] = [join(repoRoot, 'packages/sprindle/src/index.ts')]
  webConfig.compilerOptions.paths['@southneuhof/sprindle/*'] = [join(repoRoot, 'packages/sprindle/src/*')]
  writeFileSync(webConfigPath, JSON.stringify(webConfig))
  for (const name of ['loom', 'sdk', 'utilities']) {
    const packageRoot = join(root, 'packages', name)
    mkdirSync(packageRoot, { recursive: true })
    copyFileSync(join(repoRoot, 'packages', name, 'package.json'), join(packageRoot, 'package.json'))
    if (name !== 'sdk') symlinkSync(join(repoRoot, 'packages', name, 'node_modules'), join(packageRoot, 'node_modules'), 'dir')
  }

  const workspaceModules = join(root, 'node_modules')
  mkdirSync(workspaceModules, { recursive: true })
  symlinkSync(join(repoRoot, 'node_modules/.pnpm'), join(workspaceModules, '.pnpm'), 'dir')
  mkdirSync(join(workspaceModules, '@southneuhof'), { recursive: true })
  mkdirSync(join(workspaceModules, '@types'), { recursive: true })
  symlinkSync(join(repoRoot, 'apps/api/node_modules/@types/node'), join(workspaceModules, '@types/node'), 'dir')
  symlinkSync(dirname(createRequire(join(sprindleRoot, 'package.json')).resolve('typescript/package.json')), join(workspaceModules, 'typescript'), 'dir')
  symlinkSync(apiRoot, join(workspaceModules, '@southneuhof/api'), 'dir')
  symlinkSync(join(root, 'packages/sdk'), join(workspaceModules, '@southneuhof/sdk'), 'dir')
  symlinkSync(sprindleRoot, join(workspaceModules, '@southneuhof/sprindle'), 'dir')
  symlinkSync(join(repoRoot, 'apps/api/node_modules/hono'), join(workspaceModules, 'hono'), 'dir')

  const guardPath = join(root, 'apps/web/scripts/ensure-routes-contract.mjs')
  mkdirSync(dirname(guardPath), { recursive: true })
  copyFileSync(join(webRoot, 'scripts/ensure-routes-contract.mjs'), guardPath)
  const sdkPath = join(root, 'packages/sdk/src/client.ts')
  mkdirSync(dirname(sdkPath), { recursive: true })
  copyFileSync(join(repoRoot, 'packages/sdk/src/client.ts'), sdkPath)
  put(join(apiRoot, 'src/shared/result.ts'), `export type Result = { state: string }\n`)
  if (conflictingAlias || typeOnlyAliasConflict) {
    put(join(apiRoot, 'src/domain/tax.ts'), `export type Tax = { value: string }; export const tax: Tax = { value: 'api' }\n`)
    put(join(root, 'apps/web/browser/tax.ts'), `export type Tax = { value: string }; export const tax: Tax = { value: 'browser' }\n`)
    put(join(apiRoot, 'src/shared/tax-alias.ts'), `export { tax } from '@domain/tax'\n`)
    if (typeOnlyAliasConflict) {
      put(join(apiRoot, 'src/contracts/invoice.ts'), `export type Invoice = { tax: string }\n`)
      put(join(root, 'apps/web/browser/contracts/invoice.ts'), `export type Invoice = { tax: string }\n`)
      put(
        join(apiRoot, 'src/shared/tax-result.ts'),
        `import type { Invoice } from '@contract/invoice'; import { tax } from './tax-alias'; export const getTaxResult = (): Invoice => ({ tax: tax.value })\n`
      )
    } else put(join(apiRoot, 'src/shared/tax-result.ts'), `import { tax } from './tax-alias'; export const getTaxResult = () => ({ tax: tax.value })\n`)
    put(
      join(apiRoot, 'src/routes/records/+server.ts'),
      `import { defineRoute } from '@southneuhof/sprindle'\nimport type { Result } from '../../shared/result'\nimport { getTaxResult } from '../../shared/tax-result'\nexport const GET = defineRoute({ action: (): Result & { tax: string } => ({ state: 'current', ...getTaxResult() }) })\n`
    )
  } else {
    put(
      join(apiRoot, 'src/routes/records/+server.ts'),
      `import { defineRoute } from '@southneuhof/sprindle'\nimport type { Result } from '../../shared/result'\nexport const GET = defineRoute({ action: (): Result => ({ state: 'current' }) })\n`
    )
  }

  const sdkRoot = join(root, 'packages/sdk')
  copyFileSync(join(repoRoot, 'packages/sdk/tsconfig.json'), join(sdkRoot, 'tsconfig.json'))
  if (conflictingAlias || typeOnlyAliasConflict) {
    const sdkConfigPath = join(sdkRoot, 'tsconfig.json')
    const sdkConfig = parseJsonc(readFileSync(sdkConfigPath, 'utf8'))
    sdkConfig.compilerOptions.rootDir = '/'
    sdkConfig.compilerOptions.types = ['node']
    sdkConfig.compilerOptions.typeRoots = [join(apiRoot, 'node_modules/@types')]
    sdkConfig.compilerOptions.paths = {
      '@domain/*': ['../../apps/web/browser/*'],
      '@southneuhof/sprindle': [join(repoRoot, 'packages/sprindle/src/index.ts')],
      '@southneuhof/sprindle/*': [join(repoRoot, 'packages/sprindle/src/*')],
    }
    writeFileSync(sdkConfigPath, JSON.stringify(sdkConfig))
  }
  mkdirSync(join(sdkRoot, 'scripts'), { recursive: true })
  copyFileSync(join(repoRoot, 'packages/sdk/scripts/ensure-routes-contract.mjs'), join(sdkRoot, 'scripts/ensure-routes-contract.mjs'))

  return { root, apiRoot, guardPath, webRoot: join(root, 'apps/web'), sdkRoot }
}

function runGuard(current, extraEnv = {}) {
  return spawnSync(process.execPath, [current.guardPath], {
    cwd: join(current.root, 'apps/web'),
    encoding: 'utf8',
    env: { ...process.env, ...extraEnv },
  })
}

function routeReceipt(current) {
  const pointer = readFileSync(join(current.apiRoot, '.sprindle/routes.ts'), 'utf8')
  const version = pointer.match(/\.\/source\/([a-f0-9]{64})\/routes/)?.[1]
  assert.ok(version, pointer)
  return JSON.parse(readFileSync(join(current.apiRoot, '.sprindle/source', version, 'resolution.json'), 'utf8'))
}

function addExternalPackage(current, consumerAlias = false) {
  const packageRoot = join(current.root, 'node_modules/@fixture/dual')
  put(
    join(packageRoot, 'package.json'),
    JSON.stringify({
      name: '@fixture/dual',
      type: 'module',
      exports: { '.': { types: './types/index.d.ts', import: './runtime/index.js', default: './runtime/index.js' } },
    })
  )
  put(join(packageRoot, 'types/index.d.ts'), `export type Payload = { value: string }; export declare const payload: Payload\n`)
  put(join(packageRoot, 'runtime/index.js'), `export const payload = { value: 'package' }\n`)
  put(join(current.apiRoot, 'src/shared/package-value.ts'), `import { payload } from '@fixture/dual'; export const getPackageValue = () => payload.value\n`)
  put(
    join(current.apiRoot, 'src/routes/records/+server.ts'),
    `import { defineRoute } from '@southneuhof/sprindle'\nimport { getPackageValue } from '../../shared/package-value'\nexport const GET = defineRoute({ action: () => ({ value: getPackageValue() }) })\n`
  )
  if (consumerAlias) {
    put(join(current.root, 'apps/web/browser/dual.ts'), `export type Payload = { value: string }; export const payload: Payload = { value: 'browser' }\n`)
    const configPath = join(current.webRoot, 'tsconfig.app.json')
    const config = parseJsonc(readFileSync(configPath, 'utf8'))
    config.compilerOptions.paths['@fixture/dual'] = ['./browser/dual.ts']
    writeFileSync(configPath, JSON.stringify(config))
  }
}

function compileConsumer(current, name, source) {
  const path = join(current.root, 'consumers', `${name}.ts`)
  put(path, source)
  const config = join(current.root, 'consumers/tsconfig.json')
  put(
    config,
    JSON.stringify({
      compilerOptions: {
        strict: true,
        noEmit: true,
        skipLibCheck: true,
        module: 'ESNext',
        moduleResolution: 'Bundler',
        target: 'ES2022',
        types: ['node'],
        typeRoots: [join(current.root, 'apps/web/node_modules/@types')],
      },
      files: [path],
    })
  )
  return spawnSync(process.execPath, [typescriptCompiler, '--pretty', 'false', '-p', config], { cwd: current.root, encoding: 'utf8' })
}

function typeCheckWeb(current) {
  return spawnSync(process.execPath, [vueTypeScriptCompiler, '--noEmit', '--pretty', 'false', '-p', join(current.webRoot, 'tsconfig.vitest.json')], { cwd: current.root, encoding: 'utf8' })
}

function typeCheckSdk(current) {
  return spawnSync('pnpm', ['--dir', current.sdkRoot, 'run', 'type-check'], { cwd: current.root, encoding: 'utf8', env: { ...process.env } })
}

function runApiValue(current) {
  const runtimeFile = join(current.apiRoot, 'runtime.mts')
  put(
    runtimeFile,
    `import { Hono } from 'hono'; import { installSprindle } from '@southneuhof/sprindle/hono'; import manifest from './.sprindle/routes.mjs'; const app = installSprindle(new Hono(), manifest); const response = await app.request('/records'); const value = await response.json(); if (value.tax !== 'api') throw new Error(JSON.stringify(value)); console.log(value.tax)`
  )
  return spawnSync(process.execPath, ['--import', 'tsx', runtimeFile], { cwd: current.apiRoot, encoding: 'utf8' })
}

function responseConsumer(state, compare = false) {
  const proof = compare ? `if (output.state === ${JSON.stringify(state)}) throw new Error('unexpected response state')` : `const state: ${JSON.stringify(state)} = output.state\nvoid state`
  return `import type { InferResponseType } from 'hono/client'\nimport type { RpcClient } from '@southneuhof/sdk/client'\ntype Output = InferResponseType<RpcClient['records']['$get'], 200>\ndeclare const output: Output\n${proof}\n`
}

function routeConsumer(path) {
  return `import type { RpcClient } from '@southneuhof/sdk/client'\ndeclare const client: RpcClient\nvoid client${path}.$get\n`
}

function outputOf(result) {
  return `${result.stdout ?? ''}${result.stderr ?? ''}`
}

function expectTypeError(result, code) {
  assert.notEqual(result.status, 0, outputOf(result))
  assert.match(outputOf(result), new RegExp(`error TS${code}:`))
}

test('refreshes the real SDK contract and follows live API source types', { timeout: 180_000 }, () => {
  const current = fixture()
  const first = runGuard(current)
  assert.equal(first.status, 0, `${outputOf(first)}\n${first.error?.stack ?? ''}`)
  const initialResponse = compileConsumer(current, 'initial-response', responseConsumer('other', true))
  assert.equal(initialResponse.status, 0, outputOf(initialResponse))

  const contractPath = join(current.apiRoot, '.sprindle/routes.ts')
  const firstSource = readFileSync(contractPath, 'utf8')
  const unchanged = runGuard(current)
  assert.equal(unchanged.status, 0, outputOf(unchanged))
  assert.equal(readFileSync(contractPath, 'utf8'), firstSource)

  put(join(current.apiRoot, 'src/shared/result.ts'), `export type Result = { state: 'current' }\n`)
  assert.equal(compileConsumer(current, 'live-new-response', responseConsumer('current')).status, 0)
  expectTypeError(compileConsumer(current, 'live-old-response', responseConsumer('other', true)), '2367')
  assert.equal(readFileSync(contractPath, 'utf8'), firstSource)

  const refreshed = runGuard(current)
  assert.equal(refreshed.status, 0, outputOf(refreshed))
  const newResponse = compileConsumer(current, 'new-response', responseConsumer('current'))
  assert.equal(newResponse.status, 0, outputOf(newResponse))
  expectTypeError(compileConsumer(current, 'old-response', responseConsumer('other', true)), '2367')

  put(join(current.apiRoot, 'src/routes/added/+server.ts'), `import { defineRoute } from '@southneuhof/sprindle'\nexport const GET = defineRoute({ action: () => ({ added: true }) })\n`)
  const added = runGuard(current)
  assert.equal(added.status, 0, outputOf(added))
  assert.equal(compileConsumer(current, 'added-route', routeConsumer("['added']")).status, 0)

  mkdirSync(join(current.apiRoot, 'src/routes/archive'), { recursive: true })
  renameSync(join(current.apiRoot, 'src/routes/records/+server.ts'), join(current.apiRoot, 'src/routes/archive/+server.ts'))
  rmSync(join(current.apiRoot, 'src/routes/added'), { recursive: true })
  const movedAndDeleted = runGuard(current)
  assert.equal(movedAndDeleted.status, 0, outputOf(movedAndDeleted))
  assert.equal(compileConsumer(current, 'moved-route', routeConsumer("['archive']")).status, 0)
  expectTypeError(compileConsumer(current, 'old-route-path', routeConsumer("['records']")), '7053')
  expectTypeError(compileConsumer(current, 'deleted-route', routeConsumer("['added']")), '7053')

  const routePath = join(current.apiRoot, 'src/routes/archive/+server.ts')
  const routeSource = readFileSync(routePath, 'utf8')
  const sourceBeforeFailure = readFileSync(contractPath, 'utf8')
  put(routePath, `import { defineRoute } from '@southneuhof/sprindle'\nexport const GET = defineRoute({ action: () => {\n`)
  const failedBuild = runGuard(current)
  assert.notEqual(failedBuild.status, 0, outputOf(failedBuild))
  assert.match(outputOf(failedBuild), /routes:build/)
  assert.equal(existsSync(contractPath), true)
  assert.equal(readFileSync(contractPath, 'utf8'), sourceBeforeFailure)
  put(routePath, routeSource)
  const recovered = runGuard(current)
  assert.equal(recovered.status, 0, outputOf(recovered))
  assert.equal(compileConsumer(current, 'recovered-route', routeConsumer("['archive']")).status, 0)
})

test('rejects a same-typed alias shadow in an ordinary route helper', { timeout: 180_000 }, () => {
  const current = fixture(true)
  const guarded = runGuard(current)
  const consumer = typeCheckWeb(current)
  const runtime = runApiValue(current)
  assert.notEqual(guarded.status, 0, `guard exited ${guarded.status}; web type check exited ${consumer.status}; API value was ${outputOf(runtime)}\n${outputOf(guarded)}`)
  assert.match(outputOf(guarded), /import agreement.*@domain\/tax/s)
  assert.match(outputOf(guarded), /tax-alias\.ts/s)
  assert.equal(consumer.status, 0, outputOf(consumer))
  assert.equal(runtime.status, 0, outputOf(runtime))
  assert.match(outputOf(runtime), /api/)
  const configPath = join(current.webRoot, 'tsconfig.app.json')
  const config = parseJsonc(readFileSync(configPath, 'utf8'))
  config.compilerOptions.paths['@domain/*'] = ['../api/src/domain/*']
  writeFileSync(configPath, JSON.stringify(config))
  const repaired = runGuard(current, { SPRINDLE_SOURCE_MANIFEST: '1' })
  assert.equal(repaired.status, 0, outputOf(repaired))
  const receipt = routeReceipt(current)
  const edge = receipt.edges.find((item) => item.importer.endsWith('/src/shared/tax-alias.ts') && item.specifier === '@domain/tax')
  assert.equal(receipt.runtimeMode, 'source')
  assert.equal(edge.runtimeEvidence, 'node')
  assert.match(edge.runtimeTarget, /\/apps\/api\/src\/domain\/tax\.ts$/)
  assert.equal(runApiValue(current).status, 0)
})

test('rejects a local type-only alias mismatch in an ordinary helper', { timeout: 180_000 }, () => {
  const current = fixture(false, true)
  const guarded = runGuard(current)
  const consumer = typeCheckWeb(current)
  assert.notEqual(guarded.status, 0, outputOf(guarded))
  assert.match(outputOf(guarded), /import agreement.*@contract\/invoice/s)
  assert.match(outputOf(guarded), /tax-result\.ts/s)
  assert.match(outputOf(guarded), /apps\/api\/src\/contracts\/invoice\.ts/s)
  assert.match(outputOf(guarded), /apps\/web\/browser\/contracts\/invoice\.ts/s)
  assert.equal(consumer.status, 0, outputOf(consumer))
})

test('accepts an external package with declared runtime and declaration targets', { timeout: 180_000 }, () => {
  const current = fixture()
  addExternalPackage(current)
  const guarded = runGuard(current)
  assert.equal(guarded.status, 0, outputOf(guarded))
  const edge = routeReceipt(current).edges.find((item) => item.specifier === '@fixture/dual')
  assert.match(edge.runtimeTarget, /\/runtime\/index\.js$/)
  assert.equal(edge.typeTargets.length, 1)
  assert.match(edge.typeTargets[0], /\/types\/index\.d\.ts$/)
})

test('checks a projected route import from its generated source location', { timeout: 180_000 }, () => {
  const current = fixture()
  const rootPackage = join(current.root, 'node_modules/@fixture/dual')
  const nestedPackage = join(current.apiRoot, 'src/routes/records/node_modules/@fixture/dual')
  for (const [packageRoot, value] of [
    [rootPackage, 'root'],
    [nestedPackage, 'nested'],
  ]) {
    put(join(packageRoot, 'package.json'), JSON.stringify({ name: '@fixture/dual', type: 'module', exports: { '.': { types: './types/index.d.ts', default: './runtime/index.js' } } }))
    put(join(packageRoot, 'types/index.d.ts'), `export type Payload = { value: string }; export declare const payload: Payload\n`)
    put(join(packageRoot, 'runtime/index.js'), `export const payload = { value: ${JSON.stringify(value)} }\n`)
  }
  const apiConfigPath = join(current.apiRoot, 'tsconfig.json')
  const apiConfig = parseJsonc(readFileSync(apiConfigPath, 'utf8'))
  apiConfig.compilerOptions.paths['@fixture/dual'] = [join(rootPackage, 'types/index.d.ts')]
  writeFileSync(apiConfigPath, JSON.stringify(apiConfig))
  put(join(current.apiRoot, 'src/routes/records/tax.ts'), `import { defineRoute } from '@southneuhof/sprindle';export const tax = 'current'\n`)
  put(
    join(current.apiRoot, 'src/routes/records/+server.ts'),
    `import { defineRoute } from '@southneuhof/sprindle';import { payload } from '@fixture/dual';import { tax } from './tax';export const GET=defineRoute({action:()=>({payload,tax})})\n`
  )
  const guarded = runGuard(current)
  assert.equal(guarded.status, 0, outputOf(guarded))
  const edge = routeReceipt(current).edges.find((item) => item.importer.endsWith('/src/routes/records/+server.ts') && item.specifier === '@fixture/dual')
  assert.equal(edge.consumerSource, 'routes/records/+server.ts')
  assert.equal(edge.consumerSpecifier, '@fixture/dual')
  assert.match(edge.typeTargets[0], /node_modules\/@fixture\/dual\/types\/index\.d\.ts$/)
  assert.doesNotMatch(edge.typeTargets[0], /src\/routes\/records\/node_modules/)
  const local = routeReceipt(current).edges.find((item) => item.importer.endsWith('/src/routes/records/+server.ts') && item.specifier === './tax')
  assert.equal(local.consumerSource, 'routes/records/+server.ts')
  assert.equal(local.consumerSpecifier, './tax')
  assert.equal(
    routeReceipt(current).sourceOrigins.some((item) => item.source === 'routes/records/tax.ts' && item.origin.endsWith('/src/routes/records/tax.ts')),
    true
  )
})

test('rejects a consumer conditional branch that differs from the producer branch', { timeout: 180_000 }, () => {
  const current = fixture()
  const packageRoot = join(current.root, 'node_modules/@fixture/branch')
  put(
    join(packageRoot, 'package.json'),
    JSON.stringify({
      name: '@fixture/branch',
      type: 'module',
      exports: { '.': { browser: { types: './browser/index.d.ts', default: './browser/index.js' }, types: './types/index.d.ts', default: './runtime/index.js' } },
    })
  )
  put(join(packageRoot, 'browser/index.d.ts'), `export type Payload = { value: string }; export declare const payload: Payload\n`)
  put(join(packageRoot, 'browser/index.js'), `export const payload = { value: 'browser' }\n`)
  put(join(packageRoot, 'types/index.d.ts'), `export type Payload = { value: string }; export declare const payload: Payload\n`)
  put(join(packageRoot, 'runtime/index.js'), `export const payload = { value: 'runtime' }\n`)
  put(
    join(current.apiRoot, 'src/routes/records/+server.ts'),
    `import { defineRoute } from '@southneuhof/sprindle';import { payload } from '@fixture/branch';export const GET=defineRoute({action:()=>({value:payload.value})})\n`
  )
  const configPath = join(current.webRoot, 'tsconfig.app.json')
  const config = parseJsonc(readFileSync(configPath, 'utf8'))
  config.compilerOptions.customConditions = ['browser']
  writeFileSync(configPath, JSON.stringify(config))
  const guarded = runGuard(current)
  assert.notEqual(guarded.status, 0, outputOf(guarded))
  assert.match(outputOf(guarded), /import agreement.*@fixture\/branch/s)
  assert.match(outputOf(guarded), /browser\/index\.d\.ts/s)
  const edge = routeReceipt(current).edges.find((item) => item.importer.endsWith('/src/routes/records/+server.ts') && item.specifier === '@fixture/branch')
  assert.equal(edge.consumerSource, 'routes/records/+server.ts')
  assert.equal(edge.consumerSpecifier, '@fixture/branch')
})

test('rejects a consumer alias that shadows an external package', { timeout: 180_000 }, () => {
  const current = fixture()
  addExternalPackage(current, true)
  const guarded = runGuard(current)
  assert.notEqual(guarded.status, 0, outputOf(guarded))
  assert.match(outputOf(guarded), /import agreement.*@fixture\/dual/s)
  assert.match(outputOf(guarded), /runtime\/index\.js/s)
  assert.match(outputOf(guarded), /browser\/dual\.ts/s)
})

test('standalone SDK type-check refreshes and verifies with TypeScript 7', { timeout: 180_000 }, () => {
  const current = fixture(true)
  const contractPath = join(current.apiRoot, '.sprindle/routes.ts')
  assert.equal(existsSync(contractPath), false)
  const rejected = typeCheckSdk(current)
  assert.notEqual(rejected.status, 0, outputOf(rejected))
  assert.match(outputOf(rejected), /import agreement.*@domain\/tax/s)
  assert.match(outputOf(rejected), /tax-alias\.ts/s)
  assert.equal(existsSync(contractPath), true)
  const sdkConfigPath = join(current.sdkRoot, 'tsconfig.json')
  const sdkConfig = parseJsonc(readFileSync(sdkConfigPath, 'utf8'))
  sdkConfig.compilerOptions.paths['@domain/*'] = ['../../apps/api/src/domain/*']
  writeFileSync(sdkConfigPath, JSON.stringify(sdkConfig))
  const repaired = typeCheckSdk(current)
  assert.equal(repaired.status, 0, outputOf(repaired))
})

after(() => {
  for (const root of temporaryRoots) rmSync(root, { recursive: true, force: true })
})
