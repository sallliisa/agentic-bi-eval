import { defineDetail, defineForm, defineResource, defineTable } from '@southneuhof/loom'
import { testRunUpdateSchema } from '@southneuhof/api/src/routes/(authenticated)/test-runs/schema.ts'
import { appInputPresets } from '@/configs/input-presets'
import { appLabels } from '@/configs/labels'
import { testRunsActions } from './test-runs.actions'
import { testRunRecordSchema } from './test-runs.schema'

const labels = {
  ...appLabels,
  name: 'Run Name',
  setName: 'Test Set',
  modelId: 'Model ID',
  repetitions: 'Repetitions',
  status: 'Status',
  error: 'Error',
  startedAt: 'Started At',
  finishedAt: 'Finished At',
}
const runTable = defineTable({
  schema: testRunRecordSchema,
  labels,
  columns: {
    name: {},
    setName: {},
    status: {},
    startedAt: { class: 'min-w-max whitespace-nowrap' },
    finishedAt: { class: 'min-w-max whitespace-nowrap' },
  },
})
const runDetail = defineDetail({
  schema: testRunRecordSchema,
  labels,
  fields: { name: {}, setName: {}, modelId: {}, repetitions: {}, status: {}, error: {}, startedAt: { format: 'datetime' }, finishedAt: { format: 'datetime' } },
})

const runUpdateForm = defineForm({
  schema: testRunUpdateSchema,
  labels,
  fields: { name: appInputPresets.name },
})

export const testRuns = defineResource({
  key: 'test-runs',
  identity: (record: { id: string }) => record.id,
  list: {
    permission: 'view-test-runs',
    route: { name: 'test-runner-test-runs' },
    table: { ...runTable, load: testRunsActions.list },
  },
  detail: {
    permission: 'view-test-runs',
    route: { name: 'test-runner-test-runs-detail', params: (id) => ({ runId: String(id) }) },
    title: 'Test Run',
    detail: () => ({ ...runDetail, load: testRunsActions.detail }),
  },
  update: {
    permission: 'execute-test-runs',
    route: { name: 'test-runner-test-runs-edit', params: (id) => ({ runId: String(id) }) },
    form: ({ id }) => ({
      ...runUpdateForm,
      load: async (context) => {
        const record = await testRunsActions.detail(context)
        return record ? { name: record.name } : undefined
      },
      submit: (input: (typeof testRunUpdateSchema)['_output']) => testRunsActions.update(id, input),
    }),
  },
  delete: { permission: 'execute-test-runs', run: testRunsActions.delete },
  actions: {
    stop: { permission: 'execute-test-runs', run: testRunsActions.stopRun },
    retry: { permission: 'execute-test-runs', run: testRunsActions.retryResult },
    retryErrors: { permission: 'execute-test-runs', run: testRunsActions.retryErrors },
    retryRun: { permission: 'execute-test-runs', run: testRunsActions.retryRun },
  },
})
