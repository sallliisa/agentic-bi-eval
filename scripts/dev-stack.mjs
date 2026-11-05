import { existsSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const cloudflareOsRoot = resolve(process.env.CLOUDFLARE_OS_DIR || resolve(root, '../../projects/cloudflare-os-trom-poc'))
const packageManager = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
const cloudflareOsCommand = process.argv.includes('--include-cloudflare-os-ui') ? 'run-local' : 'dev-server'

if (!existsSync(resolve(cloudflareOsRoot, 'package.json'))) {
  process.stderr.write(`Cloudflare OS repo not found at ${cloudflareOsRoot}. Set CLOUDFLARE_OS_DIR to its location.\n`)
  process.exit(1)
}

const services = [
  { name: 'Carta', args: ['dev'], cwd: root },
  { name: cloudflareOsCommand === 'run-local' ? 'Cloudflare OS' : 'Cloudflare OS API', args: [cloudflareOsCommand], cwd: cloudflareOsRoot },
]
const children = []
let stopping = false

function stop(signal = 'SIGTERM') {
  if (stopping) return
  stopping = true
  for (const child of children) {
    if (child.exitCode !== null || child.signalCode !== null) continue
    if (process.platform === 'win32') child.kill(signal)
    else if (child.pid) {
      try {
        process.kill(-child.pid, signal)
      } catch (error) {
        if (error.code !== 'ESRCH') throw error
      }
    }
  }
}

for (const service of services) {
  const child = spawn(packageManager, service.args, {
    cwd: service.cwd,
    detached: process.platform !== 'win32',
    stdio: 'inherit',
  })
  children.push(child)
  child.once('error', (error) => {
    process.stderr.write(`${service.name} failed to start: ${error.message}\n`)
    process.exitCode = 1
    stop()
  })
  child.once('exit', (code, signal) => {
    if (stopping) return
    process.stderr.write(`${service.name} stopped${signal ? ` (${signal})` : ` with exit code ${code}`}\n`)
    process.exitCode = code || (signal ? 1 : 0)
    stop()
  })
}

process.once('SIGINT', () => stop('SIGINT'))
process.once('SIGTERM', () => stop('SIGTERM'))
