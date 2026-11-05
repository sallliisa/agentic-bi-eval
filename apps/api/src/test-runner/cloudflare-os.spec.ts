import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { stopCloudflareOsChats } from './cloudflare-os'

const rpcMock = vi.hoisted(() => ({
  connect: vi.fn(),
  stopAgent: vi.fn<(chatId: number) => Promise<void>>(),
  close: vi.fn(),
}))

vi.mock('capnweb', () => ({
  newWebSocketRpcSession: () => {
    rpcMock.connect()
    return {
      ping: async () => undefined,
      getServerConfig: async () => ({ passwordAuthEnabled: true }),
      login: async () => 'test-token',
      authenticate: async () => ({
        whoami: async () => ({ type: 'user' }),
        openWorkspace: async () => ({
          listChats: async () => [{ id: 101 }, { id: 337, activeAgent: {} }, { id: 338, activeAgent: {} }, { id: 339, activeAgent: {} }],
          stopAgent: rpcMock.stopAgent,
        }),
      }),
      [Symbol.dispose]: rpcMock.close,
    }
  },
}))

describe('stopping saved Cloudflare OS chats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    rpcMock.stopAgent.mockReset()
    vi.stubEnv('CLOUDFLARE_OS_ENDPOINT', 'http://localhost:8787')
    vi.stubEnv('CLOUDFLARE_OS_USERNAME', 'test-user')
    vi.stubEnv('CLOUDFLARE_OS_PASSWORD', 'test-password')
    vi.stubEnv('CLOUDFLARE_OS_WORKSPACE_ID', 'test-workspace')
  })

  afterEach(() => vi.unstubAllEnvs())

  it('cancels only matching active chats and waits for all requests before closing on failure', async () => {
    let release: (() => void) | undefined
    const pending = new Promise<void>((resolve) => { release = resolve })
    rpcMock.stopAgent.mockImplementation(async (chatId) => {
      if (chatId === 337) await pending
      else throw new Error('Remote stop failed.')
    })
    const stopped = stopCloudflareOsChats(['101', '337', '337', '339', '999'])
    const rejected = expect(stopped).rejects.toThrow('Remote stop failed.')
    try {
      await vi.waitFor(() => {
        expect(rpcMock.stopAgent.mock.calls).toEqual([[337], [339]])
      })
      expect(rpcMock.close).not.toHaveBeenCalled()
    } finally {
      release?.()
      await rejected
    }
    expect(rpcMock.close).toHaveBeenCalledOnce()
  })

  it('does not connect when the abandoned run has no saved chats', async () => {
    await stopCloudflareOsChats([])
    expect(rpcMock.connect).not.toHaveBeenCalled()
  })
})
