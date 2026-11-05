import { defineDetail, defineResource, defineTable } from '@southneuhof/loom'
import { appLabels } from '@/configs/labels'
import { modelProvidersActions } from './model-providers.actions'
import { gatewayProviderSchema, modelRecordSchema } from './model-providers.schema'

const modelLabels = {
  ...appLabels,
  provider: 'Provider',
  model: 'Model',
  source: 'Source',
  endpoint: 'Endpoint',
  contextWindow: 'Context Window',
  outputLimit: 'Output Limit',
  mode: 'Mode',
  added: 'Added',
  runtimeKnown: 'Runtime Known',
}
const modelTable = defineTable({
  schema: modelRecordSchema,
  labels: modelLabels,
  columns: { provider: {}, model: {}, name: {}, source: {}, endpoint: {} },
})
const modelDetail = defineDetail({
  schema: modelRecordSchema,
  labels: modelLabels,
  fields: { provider: {}, model: {}, name: {}, source: {}, endpoint: {}, contextWindow: {}, outputLimit: {}, mode: {}, added: {}, runtimeKnown: {} },
})

export const modelRecords = defineResource({
  key: 'cloudflare-os-models',
  identity: (record: { key: string }) => record.key,
  list: {
    permission: 'view-model-providers',
    route: { name: 'settings-model-providers' },
    table: { ...modelTable, load: modelProvidersActions.list },
  },
  detail: {
    permission: 'view-model-providers',
    route: { name: 'settings-model-providers-detail', params: (key) => ({ modelKey: String(key) }) },
    title: 'Model',
    detail: () => ({ ...modelDetail, load: ({ id }) => modelProvidersActions.detail(String(id)) }),
  },
})

export const gatewayProvidersTable = defineTable({
  schema: gatewayProviderSchema,
  labels: { ...modelLabels, provider: 'Provider', enabled: 'Enabled', enabledBy: 'Enabled By', needsApiToken: 'Needs API Token' },
  columns: { provider: {}, enabled: {}, enabledBy: {}, needsApiToken: {} },
})
