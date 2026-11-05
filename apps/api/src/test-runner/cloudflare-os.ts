import { setTimeout as delay } from 'node:timers/promises'
import { argon2id } from 'hash-wasm'
import { newWebSocketRpcSession } from 'capnweb'
import { z } from 'zod/v4'

const serviceSalt = Uint8Array.from([0xd9, 0x4e, 0x54, 0x1d, 0x29, 0xc1, 0x03, 0x74, 0x73, 0x7e, 0xb3, 0xe3, 0x34, 0x6d, 0x8f, 0x21])
const rpcTimeoutMs = 30_000
const responseTimeoutMs = 10 * 60_000
const pollIntervalMs = 2_000

const serverConfigSchema = z.object({ passwordAuthEnabled: z.boolean() })
const tokenSchema = z.string().min(1).nullable()
const identitySchema = z.object({ type: z.string() })
const modelsSchema = z.array(z.object({ id: z.string().min(1), name: z.string() }))
const chatsSchema = z.array(z.object({ id: z.number().int(), activeAgent: z.unknown().optional() }))
const historySchema = z.object({
  messages: z.array(z.object({
    sequence: z.number().int(),
    type: z.string(),
    author: z.object({ type: z.string() }),
    message: z.string().optional(),
  })),
})

type CloudflareOverseer = {
  listModels(): Promise<unknown>
  stopAgent(chatId: number): Promise<void>
  newChat(initialMessage: string, modelId: string | null): Promise<unknown>
  listChats(): Promise<unknown>
  getChatHistory(chatId: number): Promise<unknown>
}

type CloudflareAuthenticatedApi = {
  whoami(): Promise<unknown>
  openWorkspace(id: string): Promise<CloudflareOverseer>
}

type CloudflarePublicApi = {
  ping(): Promise<void>
  getServerConfig(): Promise<unknown>
  login(username: string, passwordHash: Uint8Array): Promise<unknown>
  authenticate(token: string): Promise<CloudflareAuthenticatedApi>
}

export type CloudflareOsRunner = {
  run: (prompt: string, saveChatRef: (chatRef: string) => Promise<void>) => Promise<string>
  close: () => void
}

function withTimeout<T>(operation: Promise<T>, label: string, signal?: AbortSignal): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  let onAbort: (() => void) | undefined
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(`Cloudflare OS ${label} timed out.`)), rpcTimeoutMs)
    if (signal) {
      onAbort = () => reject(signal.reason)
      if (signal.aborted) onAbort()
      else signal.addEventListener('abort', onAbort, { once: true })
    }
  })
  return Promise.race([operation, timeout]).finally(() => {
    if (timer) clearTimeout(timer)
    if (onAbort) signal?.removeEventListener('abort', onAbort)
  })
}

function socketEndpoint(value: string): string {
  const endpoint = new URL(value)
  const localHosts = new Set(['localhost', '127.0.0.1', '[::1]', '::1'])
  if (!localHosts.has(endpoint.hostname.toLowerCase()) || !['http:', 'https:'].includes(endpoint.protocol)) {
    throw new Error('Cloudflare OS must use the configured local HTTP endpoint.')
  }
  endpoint.protocol = endpoint.protocol === 'https:' ? 'wss:' : 'ws:'
  endpoint.pathname = '/api'
  endpoint.search = ''
  endpoint.hash = ''
  return endpoint.toString()
}

async function passwordHash(username: string, password: string): Promise<Uint8Array> {
  const usernameBytes = new TextEncoder().encode(username)
  const salt = new Uint8Array(serviceSalt.length + usernameBytes.length)
  salt.set(serviceSalt)
  salt.set(usernameBytes, serviceSalt.length)
  try {
    return await argon2id({
      password,
      salt,
      parallelism: 1,
      iterations: 3,
      memorySize: 65536,
      hashLength: 32,
      outputType: 'binary',
    })
  } finally {
    salt.fill(0)
    usernameBytes.fill(0)
  }
}

async function waitForResponse(overseer: CloudflareOverseer, chatId: number, signal: AbortSignal): Promise<string> {
  const deadline = Date.now() + responseTimeoutMs
  while (Date.now() < deadline) {
    signal.throwIfAborted()
    const chats = chatsSchema.parse(await withTimeout(overseer.listChats(), 'chat status request', signal))
    const chat = chats.find((item) => item.id === chatId)
    if (!chat) throw new Error('Cloudflare OS did not return the new chat.')
    if (!chat.activeAgent) {
      const history = historySchema.parse(await withTimeout(overseer.getChatHistory(chatId), 'chat response request', signal))
      const finalMessage = history.messages.at(-1)
      if (finalMessage?.type === 'error') throw new Error(finalMessage.message ?? 'Cloudflare OS reported an error.')
      if (finalMessage?.type === 'message' && finalMessage.author.type === 'agent' && typeof finalMessage.message === 'string') {
        return finalMessage.message
      }
    }
    await delay(Math.min(pollIntervalMs, Math.max(deadline - Date.now(), 0)), undefined, { signal }).catch((error: unknown) => {
      signal.throwIfAborted()
      throw error
    })
  }
  throw new Error('Cloudflare OS did not return a response before the timeout.')
}

async function connectCloudflareOs(): Promise<{ overseer: CloudflareOverseer; close: () => void }> {
  const endpoint = process.env.CLOUDFLARE_OS_ENDPOINT || 'http://localhost:8787'
  const username = process.env.CLOUDFLARE_OS_USERNAME
  const password = process.env.CLOUDFLARE_OS_PASSWORD
  const workspaceId = process.env.CLOUDFLARE_OS_WORKSPACE_ID
  if (!username || !password || !workspaceId) throw new Error('Cloudflare OS credentials and workspace ID must be set in the backend environment.')

  const publicApi = newWebSocketRpcSession<CloudflarePublicApi>(socketEndpoint(endpoint))
  try {
    await withTimeout(publicApi.ping(), 'connection check')
    const config = serverConfigSchema.parse(await withTimeout(publicApi.getServerConfig(), 'configuration request'))
    if (!config.passwordAuthEnabled) throw new Error('Cloudflare OS password login is not enabled.')

    const hash = await passwordHash(username, password)
    let token: string | null
    try {
      token = tokenSchema.parse(await withTimeout(publicApi.login(username, hash), 'login'))
    } finally {
      hash.fill(0)
    }
    if (!token) throw new Error('Cloudflare OS rejected the configured credentials.')

    const authenticatedApi = await withTimeout(publicApi.authenticate(token), 'authentication')
    token = null
    const identity = identitySchema.parse(await withTimeout(authenticatedApi.whoami(), 'identity request'))
    if (identity.type !== 'user') throw new Error('Cloudflare OS did not return a user session.')
    const overseer = await withTimeout(authenticatedApi.openWorkspace(workspaceId), 'workspace open')
    return { overseer, close: () => publicApi[Symbol.dispose]() }
  } catch (error) {
    publicApi[Symbol.dispose]()
    throw error
  }
}

export async function listCloudflareOsModels() {
  const connection = await connectCloudflareOs()
  try {
    return modelsSchema.parse(await withTimeout(connection.overseer.listModels(), 'model list request'))
  } finally {
    connection.close()
  }
}

export async function stopCloudflareOsChats(chatRefs: readonly string[]): Promise<void> {
  if (!chatRefs.length) return
  const chatIds = new Set(chatRefs.map((chatRef) => z.coerce.number().int().positive().parse(chatRef)))
  const connection = await connectCloudflareOs()
  try {
    const chats = chatsSchema.parse(await withTimeout(connection.overseer.listChats(), 'chat status request'))
    const outcomes = await Promise.allSettled(chats
      .filter((chat) => chatIds.has(chat.id) && chat.activeAgent)
      .map((chat) => withTimeout(connection.overseer.stopAgent(chat.id), 'stop agent')))
    const failure = outcomes.find((outcome) => outcome.status === 'rejected')
    if (failure) throw failure.reason
  } finally {
    connection.close()
  }
}

export async function createCloudflareOsRunner(selectedModelId: string | null, signal: AbortSignal): Promise<CloudflareOsRunner> {
  const connection = await connectCloudflareOs()
  try {
    const models = modelsSchema.parse(await withTimeout(connection.overseer.listModels(), 'model list request'))
    const model = selectedModelId == null
      ? models[0]
      : models.find(({ id }) => id === selectedModelId)
    if (!model) {
      throw new Error(selectedModelId == null
        ? 'Cloudflare OS has no configured model for this workspace.'
        : 'Cloudflare OS does not have the selected model configured for this workspace.')
    }

    return {
      run: async (prompt, saveChatRef) => {
        signal.throwIfAborted()
        const chatId = z.number().int().positive().parse(await withTimeout(connection.overseer.newChat(prompt, model.id), 'new chat'))
        try {
          await saveChatRef(String(chatId))
          signal.throwIfAborted()
          return await waitForResponse(connection.overseer, chatId, signal)
        } finally {
          if (signal.aborted) await withTimeout(connection.overseer.stopAgent(chatId), 'stop agent')
        }
      },
      close: connection.close,
    }
  } catch (error) {
    connection.close()
    throw error
  }
}
