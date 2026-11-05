import { defineDetail, defineForm, defineResource, defineTable } from '@southneuhof/loom'
import { appLabels } from '@/configs/labels'
import { appInputPresets } from '@/configs/input-presets'
import { testCaseCreateInputSchema, testCaseUpdateInputSchema, testRunStartInputSchema } from '@southneuhof/api/src/routes/(authenticated)/test-sets/schema.ts'
import { testSetsActions } from './test-sets.actions'
import { testCaseRecordSchema } from './test-cases.schema'
import { testSetCreateInputSchema, testSetRecordSchema, testSetUpdateInputSchema } from './test-sets.schema'
import { testRunsActions } from '../test-runs/test-runs.actions'

const setLabels = { ...appLabels, description: 'Description', createdAt: 'Created At', updatedAt: 'Updated At' }
const caseLabels = { ...appLabels, prompt: 'Prompt', expectedResult: 'Expected Result', createdAt: 'Created At', updatedAt: 'Updated At' }
type TestRunStartInput = (typeof testRunStartInputSchema)['_output']

const setTable = defineTable({
  schema: testSetRecordSchema,
  labels: setLabels,
  columns: {
    name: { sortable: true },
    description: {},
    createdAt: { class: 'min-w-max whitespace-nowrap' },
  },
})

const setDetail = defineDetail({
  schema: testSetRecordSchema,
  labels: setLabels,
  fields: { name: {}, description: {}, createdAt: { format: 'datetime' }, updatedAt: { format: 'datetime' } },
})

const setCreateForm = defineForm({
  schema: testSetCreateInputSchema,
  labels: setLabels,
  fields: { name: appInputPresets.name, description: appInputPresets.description },
  submit: testSetsActions.create,
})

export const testRunSetupForm = defineForm({
  schema: testRunStartInputSchema,
  labels: { ...appLabels, name: 'Run name', modelId: 'Model', repetitions: 'Repetitions' },
  fields: {
    name: { renderer: 'text' },
    modelId: {
      renderer: 'select',
      props: {
        load: testRunsActions.listRunModels,
        resource: 'test-run-models',
        namespace: 'test-run-models',
        pick: 'id',
        view: 'name',
        defaultToFirst: true,
        clearable: false,
      },
    },
    repetitions: { renderer: 'number', initialValue: 1 },
  },
})

const setUpdateForm = defineForm({
  schema: testSetUpdateInputSchema,
  labels: setLabels,
  fields: { name: appInputPresets.name, description: appInputPresets.description },
})

export const testSets = defineResource({
  key: 'test-sets',
  identity: (record: { id: string }) => record.id,
  list: {
    permission: 'view-test-sets',
    route: { name: 'test-runner-test-sets' },
    table: { ...setTable, load: testSetsActions.list },
  },
  create: {
    permission: 'manage-test-sets',
    route: { name: 'test-runner-test-sets-create' },
    form: setCreateForm,
  },
  detail: {
    permission: 'view-test-sets',
    route: { name: 'test-runner-test-sets-detail', params: (id) => ({ setId: String(id) }) },
    title: 'Test Set',
    detail: () => ({ ...setDetail, load: testSetsActions.detail }),
  },
  update: {
    permission: 'manage-test-sets',
    route: { name: 'test-runner-test-sets-edit', params: (id) => ({ setId: String(id) }) },
    form: ({ id }) => ({
      ...setUpdateForm,
      load: async (context) => {
        const record = await testSetsActions.detail(context)
        return record ? { name: record.name, description: record.description } : undefined
      },
      submit: (input: (typeof testSetUpdateInputSchema)['_output']) => testSetsActions.update(id, input),
    }),
  },
  actions: {
    run: {
      permission: 'execute-test-runs',
      run: ({ setId, ...input }: { setId: string } & TestRunStartInput) => testSetsActions.runSet(setId, input),
    },
  },
})

export function testCasesForSet(setId: string) {
  const caseTable = defineTable({
    schema: testCaseRecordSchema,
    labels: caseLabels,
    columns: { name: {}, createdAt: { class: 'min-w-max whitespace-nowrap' } },
  })
  const caseDetail = defineDetail({
    schema: testCaseRecordSchema,
    labels: caseLabels,
    fields: { name: {}, prompt: {}, expectedResult: {}, createdAt: { format: 'datetime' }, updatedAt: { format: 'datetime' } },
  })
  const caseCreateForm = defineForm({
    schema: testCaseCreateInputSchema,
    labels: caseLabels,
    fields: {
      name: appInputPresets.name,
      prompt: { renderer: 'textarea' },
      expectedResult: { renderer: 'textarea' },
    },
    submit: (input: (typeof testCaseCreateInputSchema)['_output']) => testSetsActions.createCase(setId, input),
  })
  const caseUpdateForm = defineForm({
    schema: testCaseUpdateInputSchema,
    labels: caseLabels,
    fields: {
      name: appInputPresets.name,
      prompt: { renderer: 'textarea' },
      expectedResult: { renderer: 'textarea' },
    },
  })
  return defineResource({
    key: `test-cases-${setId}`,
    identity: (record: { id: string }) => record.id,
    list: {
      permission: 'view-test-sets',
      table: { ...caseTable, pagination: false, searchParameters: { setId }, load: testSetsActions.listCases },
    },
    create: {
      permission: 'manage-test-sets',
      route: { name: 'test-runner-test-sets-detail-cases-create', params: { setId } },
      form: caseCreateForm,
    },
    detail: {
      permission: 'view-test-sets',
      route: { name: 'test-runner-test-sets-detail-cases-detail', params: (id) => ({ setId, caseId: String(id) }) },
      title: 'Test Case',
      detail: () => ({ ...caseDetail, load: ({ id }) => testSetsActions.caseDetail(setId, String(id)) }),
    },
    update: {
      permission: 'manage-test-sets',
      route: { name: 'test-runner-test-sets-detail-cases-edit', params: (id) => ({ setId, caseId: String(id) }) },
      form: ({ id }) => ({
        ...caseUpdateForm,
        load: async () => {
          const record = await testSetsActions.caseDetail(setId, String(id))
          return {
            name: record.name,
            prompt: record.prompt,
            expectedResult: record.expectedResult,
          }
        },
        submit: (input: (typeof testCaseUpdateInputSchema)['_output']) => testSetsActions.updateCase(setId, String(id), input),
      }),
    },
    delete: { permission: 'manage-test-sets', run: (id) => testSetsActions.deleteCase(setId, String(id)) },
    actions: {
      reorder: {
        permission: 'manage-test-sets',
        run: (caseIds: string[]) => testSetsActions.reorderCases(setId, { caseIds }),
      },
    },
  })
}
