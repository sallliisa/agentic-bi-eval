<route>{ "meta": { "permission": "manage-test-sets" } }</route>
<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { FormView } from '@southneuhof/loom'
import { testCasesForSet } from '../../../../test-sets.resource'

const route = useRoute('test-runner-test-sets-detail-cases-edit')
const page = computed(() => testCasesForSet(String(route.params.setId)).update({ id: String(route.params.caseId) }))
</script>

<template><FormView v-bind="page" title="Edit Test Case" /></template>
