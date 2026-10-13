import { describe, expect, it } from 'vitest'
import type {} from 'vitest/jsdom'

describe('browser storage bindings', () => {
  it.each([
    {
      name: 'localStorage',
      appStorage: () => globalThis.localStorage,
      browserStorage: () => jsdom.window.localStorage,
      appKey: 'carta-local-app-write',
      appValue: 'local value written by the app global',
      browserKey: 'carta-local-browser-write',
      browserValue: 'local value written by the JSDOM window',
    },
    {
      name: 'sessionStorage',
      appStorage: () => globalThis.sessionStorage,
      browserStorage: () => jsdom.window.sessionStorage,
      appKey: 'carta-session-app-write',
      appValue: 'session value written by the app global',
      browserKey: 'carta-session-browser-write',
      browserValue: 'session value written by the JSDOM window',
    },
  ])('$name shares writes between the app global and JSDOM window', ({ appStorage, browserStorage, appKey, appValue, browserKey, browserValue }) => {
    appStorage().setItem(appKey, appValue)
    expect(browserStorage().getItem(appKey)).toBe(appValue)

    browserStorage().setItem(browserKey, browserValue)
    expect(appStorage().getItem(browserKey)).toBe(browserValue)

    appStorage().removeItem(browserKey)
    expect(browserStorage().getItem(browserKey)).toBeNull()
  })
})
