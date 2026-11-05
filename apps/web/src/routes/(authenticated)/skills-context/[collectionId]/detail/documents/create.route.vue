<route>{ "meta": { "permission": "manage-skills-context" } }</route>
<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { FormView } from '@southneuhof/loom'
import { contextItemsForCollection } from '../../../skills-context.resource'

const route = useRoute('skills-context-detail-documents-create')
const page = computed(() => contextItemsForCollection(String(route.params.collectionId)).create)
</script>

<template>
  <FormView
    v-bind="page"
    title="Create Document or Skill"
    description="Choose a kind. For a skill, use a path such as verification/SKILL.md. For a deeper path, the skill's parent directory must already exist in this collection."
  />
</template>
