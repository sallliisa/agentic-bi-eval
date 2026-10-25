import { strict as assert } from 'node:assert'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const skillsRoot = join(root, '.agents/skills')
const active = ['carta-module-development', 'carta-module-design', 'api-conventions', 'build-resource-form', 'web-ui-surfaces', 'domain-modeling', 'verify-carta-module', 'test-audit']
function markdownFiles(path) {
  return readdirSync(path, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? markdownFiles(join(path, entry.name)) : entry.name.endsWith('.md') ? [join(path, entry.name)] : [])
}
function prose(text) {
  let fence = null
  return text.split('\n').filter(line => {
    const opening = line.match(/^\s*(`{3,}|~{3,})/)
    if (opening) { if (!fence) fence = opening[1]; else if (opening[1][0] === fence[0] && opening[1].length >= fence.length) fence = null; return false }
    return fence === null
  }).join('\n')
}
test('active module skills have unique discoverable identities and real local reference targets', () => {
  const failures = []
  for (const name of active) {
    const skill = readFileSync(join(skillsRoot, name, 'SKILL.md'), 'utf8')
    assert.match(skill, new RegExp(`^---\\nname: ${name}\\ndescription: [^\\n]+\\n---`))
    for (const file of markdownFiles(join(skillsRoot, name))) {
      for (const [, target] of prose(readFileSync(file, 'utf8')).matchAll(/\[[^\]\n]+\]\(([^)\n]+)\)/g)) {
        if (/^(?:[a-z]+:|#|<)/i.test(target)) continue
        const path = decodeURIComponent(target.split('#')[0])
        if (path && !existsSync(resolve(dirname(file), path))) failures.push(`${file}: ${target}`)
      }
    }
  }
  assert.deepEqual(failures, [])
})

test('skill calls in the active module workflow resolve to local skills', () => {
  const failures = []
  for (const name of active) for (const file of markdownFiles(join(skillsRoot, name))) {
    for (const [, invoked] of readFileSync(file, 'utf8').matchAll(/\$([a-z]+(?:-[a-z]+)+)/g)) {
      if (!existsSync(join(skillsRoot, invoked, 'SKILL.md'))) failures.push(`${file}: $${invoked}`)
    }
  }
  assert.deepEqual(failures, [])
})

test('API test entrypoints require the explicit test environment and migrations run the preflight first', () => {
  const scripts = JSON.parse(readFileSync(join(root, 'apps/api/package.json'), 'utf8')).scripts
  for (const name of ['test', 'test:focused', 'db:migrate:test', 'db:seed:test']) {
    assert.ok(scripts[name].includes('--env-file=.env.test'), name)
    assert.ok(!scripts[name].includes('--env-file-if-exists=.env.test'), name)
  }
  const preflight = scripts['db:migrate:test'].indexOf('scripts/test-target.mjs &&')
  const migration = scripts['db:migrate:test'].indexOf('drizzle-kit/bin.cjs migrate')
  assert.ok(preflight >= 0, 'test migration must run the database preflight')
  assert.ok(migration >= 0, 'test migration command must be present')
  assert.ok(preflight < migration, 'database preflight must run before migrations')
  for (const name of ['test', 'test:focused', 'db:seed:test']) assert.ok(scripts[name].includes('pnpm run db:migrate:test &&'), name)
})
