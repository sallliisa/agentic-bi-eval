import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import VueRouter from 'vue-router/vite'
import { schemaBoundaryPlugin } from './scripts/schema-boundary.mjs'
import { fileRouteOptions } from './src/router/file-routing/options'
import { navigation } from './src/manifest/navigation'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const rawPort = env.WEB_PORT
  const port = rawPort === undefined || rawPort === '' ? Number.NaN : Number(rawPort)
  if (command === 'serve' && !process.env.VITEST) {
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error('WEB_PORT is missing or invalid in apps/web/.env. Set WEB_PORT to a port 1-65535.')
    }
  }
  const validPort = Number.isInteger(port) && port >= 1 && port <= 65535 ? port : undefined
  const schemaBoundary = schemaBoundaryPlugin()
  return {
    envPrefix: ['VITE_'],
    server: {
      port: validPort,
      strictPort: true,
    },
    preview: {
      port: validPort,
      strictPort: true,
    },
    plugins: [
      schemaBoundary,
      VueRouter(fileRouteOptions(navigation)),
      vue({
        script: {
          defineModel: true,
        },
      }),
    ],
    optimizeDeps: {
      rolldownOptions: {
        plugins: [schemaBoundary],
      },
    },
    worker: {
      plugins: () => [schemaBoundaryPlugin()],
    },
    resolve: {
      dedupe: ['vue', 'vue-router'],
      alias: [
        {
          find: '@',
          replacement: fileURLToPath(new URL('./src', import.meta.url)),
        },
        {
          find: /^@southneuhof\/loom$/,
          replacement: fileURLToPath(new URL('../../packages/loom/src/index.ts', import.meta.url)),
        },
        {
          find: /^@southneuhof\/loom\//,
          replacement: fileURLToPath(new URL('../../packages/loom/src/', import.meta.url)),
        },
        {
          find: /^@southneuhof\/sdk$/,
          replacement: fileURLToPath(new URL('../../packages/sdk/src/index.ts', import.meta.url)),
        },
        {
          find: /^@southneuhof\/sdk\//,
          replacement: fileURLToPath(new URL('../../packages/sdk/src/', import.meta.url)),
        },
      ],
    },
    esbuild: {
      jsxFactory: 'h',
      jsxFragment: 'Fragment',
    },
    test: {
      environment: 'jsdom',
      setupFiles: [fileURLToPath(new URL('./src/test/setup.ts', import.meta.url))],
      testTimeout: 30000,
      hookTimeout: 30000,
      teardownTimeout: 10000,
      poolOptions: {
        forks: {
          maxWorkers: 2,
        },
      },
    },
  }
})
