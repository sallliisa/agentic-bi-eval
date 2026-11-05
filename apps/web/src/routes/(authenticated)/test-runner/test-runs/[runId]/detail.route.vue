<route>{ "meta": { "permission": "view-test-runs" } }</route>
<script setup lang="ts">
import { computed, onScopeDispose, ref } from 'vue'
import { useRoute } from 'vue-router'
import { DetailView, ListView, defineTable, invalidateResourceData, recordKey, useLoader, useFrameworkQueryClient } from '@southneuhof/loom'
import type { RecordLoadContext } from '@southneuhof/loom'
import Button from '@southneuhof/loom/components/base/Button.vue'
import Dialog from '@southneuhof/loom/components/base/Dialog.vue'
import Icon from '@southneuhof/loom/components/base/Icon.vue'
import { toast } from 'vue-sonner'
import { errorMessage, normalizeError } from '@/framework/adapters/data/normalize'
import ResponseDiff from '../ResponseDiff.vue'
import type { TestRunCaseSummaryRecord, TestRunRecord, TestRunResultRecord } from '../test-runs.schema'
import { testRunsActions } from '../test-runs.actions'
import { testRuns } from '../test-runs.resource'
import { testRunCaseSummaryRecordSchema } from '../test-runs.schema'

const route = useRoute('test-runner-test-runs-detail')
const runId = computed(() => String(route.params.runId))
const queryClient = useFrameworkQueryClient()
const runPage = computed(() => testRuns.detail({ id: runId.value }))
const runState = useLoader<RecordLoadContext, TestRunRecord | undefined>({
  key: computed(() => recordKey({ resource: 'test-runs', id: runId.value, variant: 'display', namespace: runPage.value.detail.namespace })),
  context: computed(() => ({ id: runId.value, searchParameters: {} })),
  load: computed(() => runPage.value.detail.load),
})
const currentRun = runState.data
const stopping = ref(false)
const stopAction = testRuns.actions.stop

const resultTable = defineTable({
  schema: testRunCaseSummaryRecordSchema,
  labels: { caseName: 'Case', passRatio: 'Passes' },
  columns: {
    position: {},
    caseName: {},
    passRatio: { class: 'min-w-max whitespace-nowrap' },
  },
})
const resultList = computed(() => ({
  export: false as const,
  detailRoute: () => ({ name: 'test-runner-test-runs-detail' as const, params: { runId: runId.value } }),
  table: {
    ...resultTable,
    resource: 'test-run-results',
    pagination: false as const,
    searchParameters: { runId: runId.value },
    load: testRunsActions.listCaseSummaries,
  },
}))
const selected = ref<TestRunCaseSummaryRecord>()
const open = ref(false)
const retryConfirmationOpen = ref(false)
const refreshing = ref(false)
const refreshError = ref<string>()
const retrying = ref(false)
const retryingRun = ref(false)
const retryAction = testRuns.actions.retry
const retryRunAction = testRuns.actions.retryRun
const retryErrorsAction = testRuns.actions.retryErrors
let scopeDisposed = false

onScopeDispose(() => {
  scopeDisposed = true
})

async function stopRun() {
  if (stopping.value || currentRun.value?.status !== 'running') return
  stopping.value = true
  try {
    await stopAction.run({ runId: runId.value })
    toast.success('Run stopped.')
    await refreshRun()
  } catch (error) {
    const normalized = normalizeError(error)
    if (normalized.writeOutcome === 'confirmed') {
      toast.error('The run stopped, but its data could not be refreshed. Refresh the page to check its status.')
    } else {
      toast.error(errorMessage(error, 'The run could not be stopped.'))
      await refreshRun()
    }
  } finally {
    stopping.value = false
  }
}

async function retryResult(record: TestRunResultRecord) {
  const input = { runId: runId.value, resultId: record.id }
  if (retrying.value || stopping.value || !record.finishedAt || !retryAction.can(input)) return
  retrying.value = true
  try {
    const updated = await retryAction.run(input)
    if (selected.value) {
      selected.value = {
        ...selected.value,
        attempts: selected.value.attempts.map((attempt) => (attempt.id === updated.id ? updated : attempt)),
      }
    }
    toast.success('Retry started.')
    await refreshRun()
  } catch (error) {
    toast.error(errorMessage(error, 'The case could not be retried.'))
  } finally {
    retrying.value = false
  }
}

async function refreshRun(): Promise<boolean> {
  if (refreshing.value) return false
  refreshing.value = true
  refreshError.value = undefined
  try {
    await invalidateResourceData(queryClient, { resource: 'test-runs', id: runId.value })
    await invalidateResourceData(queryClient, { resource: 'test-run-results' })
    if (selected.value) {
      const result = await testRunsActions.listCaseSummaries({ query: {}, searchParameters: { runId: runId.value } })
      selected.value = result.data.find(({ id }) => id === selected.value?.id)
    }
    return true
  } catch {
    refreshError.value = 'Could not refresh this run. Try again.'
    return false
  } finally {
    refreshing.value = false
  }
}

async function refreshAllResults(errorsOnly = false) {
  if (retryingRun.value || retrying.value || refreshing.value || stopping.value) return
  retryConfirmationOpen.value = false
  retryingRun.value = true
  try {
    const currentRun = await testRunsActions.detail({ id: runId.value, searchParameters: {} })
    if (!currentRun) throw new Error('This run could not be found.')
    if (currentRun.status === 'running') {
      await refreshRun()
      toast.error('This run is already running. Its current results were refreshed.')
      return
    }

    const action = errorsOnly ? retryErrorsAction : retryRunAction
    let finishedRun = await action.run({ runId: runId.value })
    toast.success(errorsOnly ? 'Error retries started.' : 'Run refresh started.')
    await refreshRun()

    while (!scopeDisposed && finishedRun.status === 'running') {
      await new Promise((resolve) => setTimeout(resolve, 10000))
      if (scopeDisposed) return
      const latestRun = await testRunsActions.detail({ id: runId.value, searchParameters: {} })
      if (!latestRun) throw new Error('This run could not be found.')
      finishedRun = latestRun
    }

    if (scopeDisposed) return
    if (!(await refreshRun())) return
    if (finishedRun.status === 'failed') {
      toast.error(finishedRun.error ?? 'The run refresh failed.')
      return
    }
    if (finishedRun.status !== 'stopped') toast.success(errorsOnly ? 'Error retries completed.' : 'Run refresh completed.')
  } catch (error) {
    const normalized = normalizeError(error)
    if (normalized.writeOutcome === 'confirmed') {
      toast.error('The retry started, but the run data could not be refreshed. Refresh the page to check its status.')
    } else {
      toast.error(errorMessage(error, errorsOnly ? 'Execution errors could not be retried.' : 'The run could not be refreshed.'))
    }
  } finally {
    retryingRun.value = false
  }
}

function refreshOrRetryRun() {
  if (retryRunAction.can({ runId: runId.value })) {
    retryConfirmationOpen.value = true
    return
  }
  void refreshRun()
}

function showResult(record: TestRunCaseSummaryRecord) {
  selected.value = record
  open.value = true
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <DetailView v-bind="runPage" title="Test Run">
      <template #controls>
        <div class="flex flex-wrap items-center gap-2">
          <Button v-if="retryErrorsAction.can({ runId })" variant="outlined" :disabled="refreshing || retrying || retryingRun || stopping" @click="refreshAllResults(true)"> Retry errors </Button>
          <Button v-if="currentRun?.status === 'running' && stopAction.can({ runId })" variant="outlined" color="error" :disabled="stopping" @click="stopRun">
            {{ stopping ? 'Stopping…' : 'Stop run' }}
          </Button>
          <Button variant="outlined" :disabled="refreshing || retrying || retryingRun || stopping" @click="refreshOrRetryRun">
            {{ refreshing || retryingRun ? 'Refreshing…' : 'Refresh' }}
          </Button>
          <p v-if="refreshError" role="alert" class="text-sm text-error">{{ refreshError }}</p>
        </div>
      </template>
    </DetailView>
    <ListView v-bind="resultList" title="Results">
      <template #row-actions-view="{ record }">
        <Button kind="icon" variant="standard" :ariaLabel="`View results for ${record.caseName}`" @click="showResult(record)">
          <template #icon><Icon name="eye" size="base" /></template>
        </Button>
      </template>
    </ListView>
    <Dialog v-model="open">
      <template #title>{{ selected?.caseName ?? 'Test Result' }}</template>
      <template #description>{{ selected?.passRatio ?? '0/0' }} repetitions passed</template>
      <template #content>
        <section class="flex flex-col gap-2">
          <h3 class="font-medium">Prompt</h3>
          <pre class="whitespace-pre-wrap break-words rounded bg-surface-container-low p-3">{{ selected?.attempts[0]?.prompt }}</pre>
          <section v-for="attempt in selected?.attempts ?? []" :key="attempt.id" class="flex flex-col gap-2 border-t border-outline-variant pt-3">
            <div class="flex items-center justify-between gap-2">
              <h3 class="font-medium">Repetition {{ attempt.repetition }} · {{ attempt.verdict ?? (attempt.startedAt ? 'Running' : 'Pending') }}</h3>
              <Button v-if="retryAction.can({ runId, resultId: attempt.id })" variant="outlined" :disabled="retrying || retryingRun || !attempt.finishedAt" @click="retryResult(attempt)">
                {{ retrying ? 'Retrying…' : 'Retry' }}
              </Button>
            </div>
            <p v-if="attempt.chatRef" class="text-sm text-muted">Chat {{ attempt.chatRef }}</p>
            <h4 class="font-medium">Response diff</h4>
            <ResponseDiff v-if="attempt.actualResponse !== null" :expected="attempt.expectedResult" :actual="attempt.actualResponse" />
            <p v-else class="text-sm text-muted">No response to compare yet.</p>
            <section v-if="attempt.error">
              <h4 class="font-medium">Error</h4>
              <pre class="whitespace-pre-wrap break-words rounded bg-error-container p-3">{{ attempt.error }}</pre>
            </section>
          </section>
        </section>
      </template>
    </Dialog>
    <Dialog v-model="retryConfirmationOpen">
      <template #title>Refresh this run?</template>
      <template #description>Every saved repetition will run again.</template>
      <template #content>
        <p>This replaces the current responses, verdicts, errors, chat references, and attempt times for this run.</p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <Button variant="outlined" @click="retryConfirmationOpen = false">Cancel</Button>
          <Button :disabled="retryingRun" @click="refreshAllResults()">Refresh run</Button>
        </div>
      </template>
    </Dialog>
  </div>
</template>
