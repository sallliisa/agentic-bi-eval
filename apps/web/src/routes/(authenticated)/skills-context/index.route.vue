<route>{ "meta": { "permission": "view-skills-context" } }</route>
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ListView } from '@southneuhof/loom'
import type { ListViewDeleteState } from '@southneuhof/loom'
import Button from '@southneuhof/loom/components/base/Button.vue'
import Dialog from '@southneuhof/loom/components/base/Dialog.vue'
import Icon from '@southneuhof/loom/components/base/Icon.vue'
import { toast } from 'vue-sonner'
import { skillsContextActions } from './skills-context.actions'
import { contextCollections } from './skills-context.resource'
import type { CollectionRecord } from './skills-context.schema'

const capabilityAvailable = ref<boolean>()
const collectionList = computed(() => ({
  ...contextCollections.list,
  createRoute: capabilityAvailable.value === false ? false : contextCollections.list.createRoute,
}))

async function deleteCollection(record: CollectionRecord, run: ((record: CollectionRecord) => Promise<unknown>) | undefined, setOpen: (open: boolean) => void) {
  if (!run) return
  try {
    await run(record)
    setOpen(false)
  } catch {
    return
  }
}

async function refreshDelete(state: ListViewDeleteState) {
  await state.refresh?.()
}

onMounted(async () => {
  try {
    capabilityAvailable.value = (await skillsContextActions.capabilities()).available
  } catch {
    toast.error('Could not check Skills and Context availability.')
  }
})
</script>

<template>
  <div class="flex flex-col gap-2">
    <p v-if="capabilityAvailable === false" role="status" class="text-sm text-error">Skills and Context is not available in Cloudflare OS. Configure this capability in Cloudflare OS.</p>
    <ListView v-bind="collectionList" title="Skills and Context">
      <template #row-actions-delete="{ record, deleteRecord, deleteState }">
        <div v-if="deleteState.error" role="alert" class="max-w-64 whitespace-normal text-xs text-error">
          <p v-if="deleteState.error.writeOutcome === 'confirmed'">The collection was deleted, but the list could not refresh.</p>
          <p v-else>The delete may have completed. Check the collection before trying again.</p>
          <p>{{ deleteState.error.message }}</p>
          <Button v-if="deleteState.refresh" type="button" variant="text" :disabled="deleteState.refreshing" @click="refreshDelete(deleteState)">Retry refresh</Button>
        </div>
        <Dialog v-else>
          <template #trigger>
            <Button kind="icon" variant="standard" color="error" :ariaLabel="`Delete ${record.title}`">
              <template #icon><Icon name="delete-bin" size="base" /></template>
            </Button>
          </template>
          <template #title>Delete {{ record.title }}?</template>
          <template #description>This removes the collection and its documents and skills from Skills and Context.</template>
          <template #footer="{ setOpen }">
            <div class="flex w-full justify-end gap-2">
              <Button type="button" variant="text" @click="setOpen(false)">Cancel</Button>
              <Button type="button" color="error" :disabled="deleteState.pending" @click="deleteCollection(record, deleteRecord, setOpen)">Delete collection</Button>
            </div>
          </template>
        </Dialog>
      </template>
    </ListView>
  </div>
</template>
