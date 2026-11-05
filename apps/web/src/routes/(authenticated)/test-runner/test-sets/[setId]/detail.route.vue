<route>{ "meta": { "permission": "view-test-sets" } }</route>
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { DetailView, DialogForm, invalidateResourceData, ListView, useFrameworkQueryClient } from '@southneuhof/loom'
import type { QueryValues, RowReorderPayload } from '@southneuhof/loom'
import { toast } from 'vue-sonner'
import AppRouterView from '@/components/routing/AppRouterView.vue'
import Button from '@southneuhof/loom/components/base/Button.vue'
import { errorMessage, normalizeError } from '@/framework/adapters/data/normalize'
import { testCasesForSet, testRunSetupForm, testSets } from '../test-sets.resource'
import type { TestCaseRecord } from '../test-cases.schema'
import type { TestRunRecord } from '../../test-runs/test-runs.schema'

const route = useRoute('test-runner-test-sets-detail')
const router = useRouter()
const queryClient = useFrameworkQueryClient()
const setId = computed(() => String(route.params.setId))
const cases = computed(() => testCasesForSet(setId.value))
const reorderPending = ref(false)
const caseListKey = ref(0)
const caseQuery = ref<QueryValues>({ page: 1, limit: 10 })
const runAction = testSets.actions.run
const runActionAccess = computed(() => ({ setId: setId.value, name: '', modelId: '', repetitions: 1 }))
const canStartRun = computed(() => runAction.can(runActionAccess.value))
const reorderAction = computed(() => cases.value.actions.reorder)

function hasCaseSearch(query: QueryValues) {
  return query.search !== undefined && query.search !== null && query.search !== ''
}

const caseList = computed(() => ({
  ...cases.value.list,
  table: {
    ...cases.value.list.table,
    query: caseQuery.value,
    rowKey: 'id',
    reorderable: !hasCaseSearch(caseQuery.value) && !reorderPending.value && reorderAction.value.can([]),
  },
}))

function updateCaseQuery(query: QueryValues) {
  caseQuery.value = query
}

async function reorderCases(payload: RowReorderPayload<TestCaseRecord>) {
  const action = reorderAction.value
  const caseIds = payload.rows.map(({ id }) => id)
  if (reorderPending.value || hasCaseSearch(caseQuery.value) || hasCaseSearch(payload.query) || !action.can(caseIds)) {
    caseListKey.value += 1
    return
  }
  reorderPending.value = true
  try {
    await action.run(caseIds)
    toast.success('Case order saved.')
  } catch (error) {
    const normalized = normalizeError(error)
    if (normalized.code === 'RESOURCE_POST_WRITE_INVALIDATION_FAILED' && normalized.writeOutcome === 'confirmed' && normalized.refresh) {
      try {
        await normalized.refresh()
        toast.success('Case order saved.')
      } catch {
        toast.error('Case order was saved, but the case list could not be refreshed.')
      }
    } else {
      try {
        await invalidateResourceData(queryClient, { resource: `test-cases-${setId.value}` })
        toast.error(errorMessage(error, 'The case order could not be saved.'))
      } catch {
        toast.error('The case order could not be saved, and the case list could not be refreshed.')
      }
    }
  } finally {
    caseListKey.value += 1
    reorderPending.value = false
  }
}

async function submitRun(input: { name?: string; modelId: string; repetitions: number }) {
  const actionInput = { setId: setId.value, ...input }
  if (!runAction.can(actionInput)) throw new Error('You do not have permission to execute test runs.')
  return runAction.run(actionInput)
}

async function runStarted(run: TestRunRecord) {
  try {
    await invalidateResourceData(queryClient, { resource: 'test-runs' })
  } catch {
    toast.error('The run started, but the run list could not be refreshed.')
  }
  void router.push({ name: 'test-runner-test-runs-detail', params: { runId: run.id } })
}

function runFailed(error: unknown) {
  toast.error(errorMessage(error, 'The test set could not start.'))
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <DetailView v-bind="testSets.detail({ id: setId })" title="Test Set">
      <template #controls>
        <DialogForm
          :key="setId"
          v-bind="testRunSetupForm"
          title="Run Test Set"
          description="Choose a model and repetition count. Leave the run name blank to use the test set name."
          submit-label="Start run"
          :initial-data="{ name: '' }"
          :disabled="!canStartRun"
          :submit="submitRun"
          @submitted="runStarted"
          @error="runFailed"
        >
          <template #trigger><Button :disabled="!canStartRun">Run</Button></template>
        </DialogForm>
      </template>
    </DetailView>
    <AppRouterView>
      <ListView :key="caseListKey" v-bind="caseList" title="Cases" @update:query="updateCaseQuery" @row-reorder="reorderCases" />
    </AppRouterView>
  </div>
</template>
