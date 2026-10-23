import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rename, rm, symlink, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { promisify } from 'node:util'
import { afterEach, describe, expect, it } from 'vitest'

const run = promisify(execFile)
const fixtures: string[] = []
const repoRoot = resolve(import.meta.dirname, '../../../../..')
const generator = join(repoRoot, 'apps/web/scripts/generate-route-types.mjs')
const resourceContract = `
const schema = {
  _input: { id: '' },
  _output: { id: '' },
  parseAsync: async () => ({ id: '' }),
}
const table = {
  schema,
  columns: { id: {} },
  load: async () => ({ data: [{ id: 'one' }] }),
}
const createForm = {
  schema,
  fields: {},
  submit: async (output: { id: string }) => output,
}
const detail = ({ id }: { id: string }) => ({
  schema,
  fields: {},
  load: async () => ({ id }),
})
const updateForm = ({ id }: { id: string }) => ({
  schema,
  fields: {},
  load: async () => ({ id }),
  submit: async (output: { id: string }) => ({ ...output, id }),
})
`

afterEach(async () => Promise.all(fixtures.splice(0).map((fixture) => rm(fixture, { recursive: true, force: true }))))

async function fixture(files: Record<string, string>, navigation = '[]') {
  const root = await mkdtemp(join(tmpdir(), 'carta-route-types-'))
  fixtures.push(root)
  for (const [relative, source] of Object.entries(files)) {
    const file = join(root, 'src/routes', relative)
    await mkdir(dirname(file), { recursive: true })
    await writeFile(file, source)
  }
  await mkdir(join(root, 'src/manifest'), { recursive: true })
  await writeFile(join(root, 'src/manifest/navigation.ts'), `export const navigation = ${navigation}`)
  return root
}

async function generate(root: string) {
  return run(process.execPath, [generator, root], { cwd: repoRoot, timeout: 10_000 })
}

async function names(root: string) {
  const source = await readFile(join(root, 'src/route-map.d.ts'), 'utf8')
  return [...source.matchAll(/'([^']+)': RouteRecordInfo</g)].map((match) => match[1])
}

describe('route type generation', () => {
  it.each([
    ['sales/index.route.vue', '/sales'],
    ['sales/orders/archive/index.route.vue', '/sales/orders/archive'],
    ['purchases/orders/index.route.vue', '/purchases/orders'],
    ['sales/[section]/index.route.vue', '/sales/:section'],
  ])('rejects module navigation to %s before generating types', async (file, path) => {
    const root = await fixture({ [file]: '<route>{ "name": "entry" }</route><template />' }, `[{ kind: 'module', name: 'sales', routes: [{ to: { name: 'entry' } }] }]`)

    const result = generate(root)
    await expect(result).rejects.toMatchObject({
      code: 1,
      stderr: expect.stringContaining(`Invalid module entry: ${join(root, 'src/routes', file)}`),
    })
    await expect(result).rejects.toMatchObject({
      stderr: expect.stringContaining(`Actual URL: ${path}. Expected structure: /sales/<submodule>`),
    })
  })

  it('generates module entries, nested records, standalone pages, and public routes together', async () => {
    const root = await fixture(
      {
        'sales/orders/index.route.vue': '<template />',
        'sales/orders/[id]/detail.route.vue': '<template />',
        'dashboard/index.route.vue': '<template />',
        '(public)/auth/login/index.route.vue': '<template />',
      },
      `[
        { kind: 'module', name: 'sales', routes: [{ to: { name: 'sales-orders' } }] },
        { kind: 'standalone', name: 'dashboard', routes: [{ to: { name: 'dashboard' } }] },
      ]`
    )

    await expect(generate(root)).resolves.toMatchObject({ stderr: '' })
    expect(await names(root)).toEqual(['auth-login', 'dashboard', 'sales-orders', 'sales-orders-detail'])
  })

  it.each([
    [`{ name: 'sales', routes: [{ to: { name: 'sales-orders' } }] }`, 'must declare kind'],
    [`{ kind: 'module', name: 'sales', routes: [{ to: { name: 'missing' } }] }`, 'Unknown navigation route "missing"'],
  ])('rejects an invalid navigation declaration: %s', async (module, message) => {
    const root = await fixture({ 'sales/orders/index.route.vue': '<template />' }, `[${module}]`)

    await expect(generate(root)).rejects.toMatchObject({ code: 1, stderr: expect.stringContaining(message) })
  })

  it('creates and refreshes route declarations for additions, renames, and deletions', async () => {
    const root = await fixture({ 'alpha.route.vue': '<template />' })
    await expect(generate(root)).resolves.toMatchObject({ stderr: '' })
    expect(await names(root)).toEqual(['alpha'])

    await writeFile(join(root, 'src/routes/beta.route.vue'), '<template />')
    await generate(root)
    expect(await names(root)).toEqual(['alpha', 'beta'])

    await rename(join(root, 'src/routes/alpha.route.vue'), join(root, 'src/routes/gamma.route.vue'))
    await generate(root)
    expect(await names(root)).toEqual(['beta', 'gamma'])

    await rm(join(root, 'src/routes/beta.route.vue'))
    await generate(root)
    expect(await names(root)).toEqual(['gamma'])

    await generate(root)
    expect(await names(root)).toEqual(['gamma'])
  })

  it('rejects duplicate generated names', async () => {
    const root = await fixture({
      'alpha.route.vue': '<template />',
      'group/alpha.route.vue': '<route>{ "name": "alpha" }</route><template />',
    })

    await expect(generate(root)).rejects.toMatchObject({ code: 1 })
  })

  it('makes a deleted route fail through the real resource contract', async () => {
    const root = await fixture({ 'alpha.route.vue': '<template />', 'keeper.route.vue': '<template />' })
    const consumer = join(root, 'consumer.ts')
    const tsconfig = join(root, 'tsconfig.json')
    const loom = join(repoRoot, 'packages/loom/src/resources/defineResource.ts')
    const vueShim = join(repoRoot, 'packages/loom/env.d.ts')
    await mkdir(join(root, 'node_modules'), { recursive: true })
    await symlink(join(repoRoot, 'apps/web/node_modules/vue-router'), join(root, 'node_modules/vue-router'))
    await writeFile(
      consumer,
      `import { defineResource } from '@southneuhof/loom'
${resourceContract}
defineResource({
  key: 'fixture',
  identity: (record: { id: string }) => record.id,
  list: { permission: null, route: { name: 'alpha' }, table },
})
`
    )
    await writeFile(
      tsconfig,
      JSON.stringify({
        compilerOptions: {
          strict: true,
          noImplicitAny: false,
          noEmit: true,
          skipLibCheck: true,
          module: 'esnext',
          moduleResolution: 'bundler',
          target: 'es2022',
          paths: {
            '@southneuhof/loom': [loom],
          },
        },
        files: [join(root, 'src/route-map.d.ts'), consumer, vueShim],
      })
    )
    const compile = () => run('pnpm', ['--filter', '@southneuhof/loom', 'exec', 'tsc', '-p', tsconfig], { cwd: repoRoot, timeout: 20_000 })

    await generate(root)
    await expect(compile()).resolves.toMatchObject({ stderr: '' })
    await rm(join(root, 'src/routes/alpha.route.vue'))
    await generate(root)
    expect(await names(root)).toEqual(['keeper'])
    await expect(compile()).rejects.toMatchObject({
      code: 1,
      stdout: expect.stringMatching(/consumer\.ts\(\d+,\d+\): error TS2322: Type '"alpha"' is not assignable/),
    })
    await writeFile(join(root, 'src/routes/alpha.route.vue'), '<template />')
    await generate(root)
    await expect(compile()).resolves.toMatchObject({ stderr: '' })
  })

  it('checks optional, repeatable, empty, and exact resource parameters', async () => {
    const root = await fixture({
      'empty.route.vue': '<template />',
      'docs/[[lang]]/[...path].route.vue': '<template />',
      'repeat/[tags]+.route.vue': '<template />',
      'optional/[[value]].route.vue': '<template />',
    })
    const consumer = join(root, 'consumer.ts')
    const tsconfig = join(root, 'tsconfig.json')
    const loom = join(repoRoot, 'packages/loom/src/resources/defineResource.ts')
    const vueShim = join(repoRoot, 'packages/loom/env.d.ts')
    await mkdir(join(root, 'node_modules'), { recursive: true })
    await symlink(join(repoRoot, 'apps/web/node_modules/vue-router'), join(root, 'node_modules/vue-router'))
    await generate(root)
    await writeFile(
      consumer,
      `import { defineResource } from '@southneuhof/loom'
${resourceContract}
const identity = (record: { id: string }) => record.id
defineResource({ key: 'valid-empty', identity, list: { permission: null, route: { name: 'empty' }, table } })
defineResource({ key: 'valid-docs', identity, detail: { permission: null, route: { name: 'docs', params: (id) => ({ lang: id, path: 'one' }) }, detail } })
defineResource({ key: 'valid-repeat', identity, create: { permission: null, route: { name: 'repeat', params: { tags: ['one', 'two'] } }, form: createForm } })
defineResource({ key: 'valid-optional', identity, update: { permission: null, route: { name: 'optional', params: {} }, form: updateForm } })
const extra = { path: ['one'], extra: 'no' }
const extraCallback = (_id: string) => extra
defineResource({ key: 'empty-extra', identity, list: { permission: null, route: { name: 'empty', params: { extra: 'no' } }, table } })
defineResource({ key: 'bad-array', identity, create: { permission: null, route: { name: 'repeat', params: { tags: [true] } }, form: createForm } })
defineResource({ key: 'exact-object', identity, detail: { permission: null, route: { name: 'docs', params: extra }, detail } })
defineResource({ key: 'exact-callback', identity, detail: { permission: null, route: { name: 'docs', params: extraCallback }, detail } })
`
    )
    await writeFile(
      tsconfig,
      JSON.stringify({
        compilerOptions: {
          strict: true,
          noImplicitAny: false,
          noEmit: true,
          skipLibCheck: true,
          module: 'esnext',
          moduleResolution: 'bundler',
          target: 'es2022',
          paths: { '@southneuhof/loom': [loom] },
        },
        files: [join(root, 'src/route-map.d.ts'), consumer, vueShim],
      })
    )

    await expect(run('pnpm', ['--filter', '@southneuhof/loom', 'exec', 'tsc', '-p', tsconfig], { cwd: repoRoot, timeout: 20_000 })).rejects.toMatchObject({
      code: 1,
      stdout: expect.stringMatching(/consumer\.ts\(\d+,\d+\): error TS/),
    })
  })
})
