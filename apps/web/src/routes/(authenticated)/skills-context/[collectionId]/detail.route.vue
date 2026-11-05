<route>{ "meta": { "permission": "view-skills-context" } }</route>
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { DetailView, ListView } from '@southneuhof/loom'
import { toast } from 'vue-sonner'
import AppRouterView from '@/components/routing/AppRouterView.vue'
import Button from '@southneuhof/loom/components/base/Button.vue'
import Dialog from '@southneuhof/loom/components/base/Dialog.vue'
import Icon from '@southneuhof/loom/components/base/Icon.vue'
import { permissions } from '@/stores/permissions'
import { skillsContextActions } from '../skills-context.actions'
import { contextCollections, contextItemsForCollection } from '../skills-context.resource'
import type { CollectionRecord, ContextDocumentSummary } from '../skills-context.schema'

const route = useRoute('skills-context-detail')
const router = useRouter()
const access = permissions()
const collectionId = computed(() => String(route.params.collectionId))
const collection = ref<CollectionRecord>()
const itemResource = computed(() => contextItemsForCollection(collectionId.value))
const collectionPage = computed(() => contextCollections.detail({ id: collectionId.value }))
const itemList = computed(() => ({
  ...itemResource.value.list,
  table: { ...itemResource.value.list.table, pagination: false as const },
  createRoute: collection.value?.source === 'web' && collection.value.canEdit ? itemResource.value.list.createRoute : false,
}))

watch(
  collectionId,
  async (id) => {
    collection.value = undefined
    try {
      collection.value = await skillsContextActions.detail(id)
    } catch {
      toast.error('Could not load collection permissions.')
    }
  },
  { immediate: true }
)

function editCollection() {
  return router.push({ name: 'skills-context-detail-edit', params: { collectionId: collectionId.value } })
}

async function deleteItem(record: ContextDocumentSummary, run: ((record: ContextDocumentSummary) => Promise<unknown>) | undefined, setOpen: (open: boolean) => void) {
  if (!run) return
  try {
    await run(record)
    setOpen(false)
  } catch {
    return
  }
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <DetailView v-bind="collectionPage" title="Collection">
      <template #controls>
        <Button v-if="access.can('manage-skills-context') && collection?.source === 'web' && collection.canEdit" variant="outlined" @click="editCollection">Edit collection</Button>
      </template>
    </DetailView>
    <p v-if="collection?.source === 'git'" role="status" class="rounded-lg bg-surface-container px-4 py-3 text-sm text-on-surface">This Git-backed collection is read-only.</p>
    <ListView v-bind="itemList" title="Documents and Skills">
      <template #row-actions-delete="{ record, deleteRecord, deleteState }">
        <div v-if="deleteState.error" role="alert" class="max-w-64 whitespace-normal text-xs text-error">
          <p v-if="deleteState.error.writeOutcome === 'confirmed'">The item was deleted, but the list could not refresh.</p>
          <p v-else>The delete may have completed. Check the item before trying again.</p>
          <p>{{ deleteState.error.message }}</p>
          <Button v-if="deleteState.refresh" type="button" variant="text" :disabled="deleteState.refreshing" @click="deleteState.refresh?.()">Retry refresh</Button>
        </div>
        <Dialog v-else>
          <template #trigger>
            <Button kind="icon" variant="standard" color="error" :ariaLabel="`Delete ${record.path}`">
              <template #icon><Icon name="delete-bin" size="base" /></template>
            </Button>
          </template>
          <template #title>Delete {{ record.skillName ?? record.name }}?</template>
          <template #description>
            <span v-if="record.skillName">This deletes the skill from {{ collection?.title ?? 'this collection' }}, including its supporting documents.</span>
            <span v-else>This deletes the document from {{ collection?.title ?? 'this collection' }}.</span>
          </template>
          <template #footer="{ setOpen }">
            <div class="flex w-full justify-end gap-2">
              <Button type="button" variant="text" @click="setOpen(false)">Cancel</Button>
              <Button type="button" color="error" :disabled="deleteState.pending" @click="deleteItem(record, deleteRecord, setOpen)">Delete item</Button>
            </div>
          </template>
        </Dialog>
      </template>
    </ListView>
    <AppRouterView />
  </div>
</template>
