<route>{ "meta": { "permission": "manage-skills-context" } }</route>
<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { FormView } from '@southneuhof/loom'
import { contextCollections } from '../../skills-context.resource'

const route = useRoute('skills-context-detail-edit')
const page = computed(() => contextCollections.update({ id: String(route.params.collectionId) }))
</script>

<template>
  <FormView v-bind="page" title="Edit Collection" description="Visibility and source stay fixed after creation." />
</template>
