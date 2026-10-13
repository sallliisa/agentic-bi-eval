import { afterEach } from 'vitest'
import type {} from 'vitest/jsdom'

globalThis.localStorage = jsdom.window.localStorage
globalThis.sessionStorage = jsdom.window.sessionStorage

afterEach(() => {
  globalThis.localStorage.clear()
  globalThis.sessionStorage.clear()
})
