import { defineDetail, defineResource, defineTable } from '@southneuhof/loom'
import { appLabels } from '@/configs/labels'
import { connectorsActions } from './connectors.actions'
import { connectorResourceSchema } from '@southneuhof/api/src/routes/(authenticated)/cloudflare-os/schema.ts'
import { connectorDisplaySchema } from './connectors.schema'

const labels = {
  ...appLabels,
  vendorId: 'Vendor ID',
  displayName: 'Name',
  autoProvisions: 'Provisioning',
  enabled: 'Enabled',
  ambientMode: 'Ambient Mode',
  resources: 'Advertised Resources',
  urlPattern: 'Resource Pattern',
  title: 'Resource Type',
  description: 'Description',
}
const connectorTable = defineTable({
  schema: connectorDisplaySchema,
  labels,
  columns: { displayName: { sortable: true }, vendorId: {}, autoProvisions: {}, enabled: {}, ambientMode: {} },
})
const connectorDetail = defineDetail({
  schema: connectorDisplaySchema,
  labels,
  fields: { vendorId: {}, displayName: {}, autoProvisions: {}, enabled: {}, ambientMode: {} },
})

export const connectors = defineResource({
  key: 'cloudflare-os-connectors',
  identity: (record: { vendorId: string }) => record.vendorId,
  list: {
    permission: 'view-connectors',
    route: { name: 'settings-connectors' },
    table: { ...connectorTable, load: connectorsActions.list },
  },
  detail: {
    permission: 'view-connectors',
    route: { name: 'settings-connectors-detail', params: (id) => ({ vendorId: String(id) }) },
    title: 'Connector',
    detail: () => ({ ...connectorDetail, load: ({ id }) => connectorsActions.detail(String(id)) }),
  },
})

export const connectorResourceTable = defineTable({
  schema: connectorResourceSchema,
  labels,
  columns: { title: {}, description: {}, urlPattern: {}, enabled: {} },
})
