<route>{ "meta": { "permission": "manage-skills-context" } }</route>
<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { FormView } from '@southneuhof/loom'
import { contextItemsForCollection } from '../../../../skills-context.resource'

const route = useRoute('skills-context-detail-documents-edit')
const items = computed(() => contextItemsForCollection(String(route.params.collectionId)))
const page = computed(() => items.value.update({ id: String(route.params.documentKey) }))
</script>

<template>
  <FormView v-bind="page" title="Edit Document or Skill" description="The path stays fixed. For a skill, edit its name and description in the Markdown frontmatter." />
</template>
