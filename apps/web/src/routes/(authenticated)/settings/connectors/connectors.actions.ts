import { parseHonoResponse } from '@/framework/hono'
import { rpc } from '@/framework/rpc'
import { connectorListSchema, connectorRecordSchema } from '@southneuhof/api/src/routes/(authenticated)/cloudflare-os/schema.ts'
import { connectorDisplaySchema, type ConnectorDisplayRecord } from './connectors.schema'

function displayRecord(value: unknown): ConnectorDisplayRecord {
  const record = connectorRecordSchema.parse(value)
  return connectorDisplaySchema.parse({
    vendorId: record.vendorId,
    displayName: record.displayName,
    autoProvisions: record.autoProvisions,
    enabled: record.autoProvisions ? undefined : record.enabled,
    ambientMode: record.autoProvisions ? record.ambientMode : undefined,
    resources: record.autoProvisions ? [] : record.resources,
  })
}

async function list() {
  const endpoint = rpc['cloudflare-os'].connectors.$get
  const result = await parseHonoResponse<typeof endpoint>(await endpoint({}))
  const parsed = connectorListSchema.parse(result)
  const data = parsed.data.map(displayRecord)
  return { data, meta: { total: parsed.total, page: 1, pageSize: parsed.total, totalPage: parsed.total ? 1 : 0 } }
}

async function detail(vendorId: string) {
  const endpoint = rpc['cloudflare-os'].connectors[':vendorId'].$get
  const result = await parseHonoResponse<typeof endpoint>(await endpoint({ param: { vendorId } }))
  return displayRecord(result.data)
}

export const connectorsActions = { list, detail }
