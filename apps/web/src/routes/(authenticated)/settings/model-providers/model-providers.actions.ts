import { parseHonoResponse } from '@/framework/hono'
import { rpc } from '@/framework/rpc'
import { modelListSchema, contextModelSchema } from '@southneuhof/api/src/routes/(authenticated)/cloudflare-os/schema.ts'

async function listAll() {
  const endpoint = rpc['cloudflare-os'].models.$get
  const result = await parseHonoResponse<typeof endpoint>(await endpoint({}))
  return modelListSchema.parse(result)
}

async function list() {
  const result = await listAll()
  return { data: result.data, meta: { total: result.total, page: 1, pageSize: result.total, totalPage: result.total ? 1 : 0 } }
}

async function detail(key: string) {
  const endpoint = rpc['cloudflare-os'].models[':modelKey'].$get
  const result = await parseHonoResponse<typeof endpoint>(await endpoint({ param: { modelKey: key } }))
  return contextModelSchema.parse(result.data)
}

export const modelProvidersActions = { listAll, list, detail }
