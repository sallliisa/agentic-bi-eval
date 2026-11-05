<route>{ "meta": { "permission": "view-test-runs" } }</route>
<script setup lang="ts">
import { ListView } from '@southneuhof/loom'
import Button from '@southneuhof/loom/components/base/Button.vue'
import Dialog from '@southneuhof/loom/components/base/Dialog.vue'
import Icon from '@southneuhof/loom/components/base/Icon.vue'
import { toast } from 'vue-sonner'
import { errorMessage, normalizeError } from '@/framework/adapters/data/normalize'
import { testRuns } from './test-runs.resource'
import type { TestRunRecord } from './test-runs.schema'

async function deleteRun(record: TestRunRecord, run: ((record: TestRunRecord) => Promise<unknown>) | undefined, setOpen: (open: boolean) => void) {
  if (!run) return
  try {
    await run(record)
    setOpen(false)
    toast.success('Test run deleted.')
  } catch (error) {
    const normalized = normalizeError(error)
    if (normalized.writeOutcome === 'confirmed') {
      setOpen(false)
      toast.error('The run was deleted, but the list could not be refreshed.')
    } else if (!normalized.postWrite) {
      toast.error(errorMessage(error, 'The test run could not be deleted.'))
    }
  }
}
</script>

<template>
  <ListView v-bind="testRuns.list" title="Test Runs">
    <template #row-actions-delete="{ record, deleteRecord, deleteState }">
      <div v-if="deleteState.error" role="alert" class="max-w-64 whitespace-normal text-xs text-error">
        <p v-if="deleteState.error.writeOutcome === 'confirmed'">The run was deleted, but the list could not be refreshed.</p>
        <p v-else>The delete may have completed. Check the run before trying again.</p>
        <Button v-if="deleteState.refresh" type="button" variant="text" :disabled="deleteState.refreshing" @click="deleteState.refresh?.()">Retry refresh</Button>
      </div>
      <Dialog v-else :key="record.id">
        <template #trigger>
          <Button kind="icon" variant="standard" color="error" :disabled="record.status === 'running' || deleteState.disabled" :ariaLabel="`Delete ${record.name}`" @click.stop>
            <template #icon><Icon name="delete-bin" size="base" /></template>
          </Button>
        </template>
        <template #title>Delete {{ record.name }}?</template>
        <template #description>This permanently deletes the run and all its saved results. The test set and cases stay unchanged.</template>
        <template #footer="{ setOpen }">
          <div class="flex w-full justify-end gap-2">
            <Button type="button" variant="text" :disabled="deleteState.pending" @click="setOpen(false)">Cancel</Button>
            <Button type="button" color="error" :disabled="record.status === 'running' || deleteState.disabled" @click="deleteRun(record, deleteRecord, setOpen)">Delete run</Button>
          </div>
        </template>
      </Dialog>
    </template>
  </ListView>
</template>
