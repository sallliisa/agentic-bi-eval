<route>{ "meta": { "permission": "view-skills-context" } }</route>
<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { DetailView } from '@southneuhof/loom'
import { contextItemsForCollection } from '../../../../skills-context.resource'

const route = useRoute('skills-context-detail-documents-detail')
const page = computed(() => contextItemsForCollection(String(route.params.collectionId)).detail({ id: String(route.params.documentKey) }))
const bodySlot = 'value:body'
</script>

<template>
  <DetailView v-bind="page" title="Context Item">
    <template #[bodySlot]="{ value }">
      <pre class="whitespace-pre-wrap break-words">{{ value }}</pre>
    </template>
  </DetailView>
</template>
