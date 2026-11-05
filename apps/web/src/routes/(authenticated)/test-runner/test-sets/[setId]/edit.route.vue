<route>{ "meta": { "permission": "manage-test-sets" } }</route>
<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { FormView } from '@southneuhof/loom'
import { testSets } from '../test-sets.resource'

const route = useRoute('test-runner-test-sets-edit')
const page = computed(() => testSets.update({ id: String(route.params.setId) }))
</script>

<template><FormView v-bind="page" title="Edit Test Set" /></template>
