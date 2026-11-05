<route>{ "meta": { "permission": "view-test-sets" } }</route>
<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { DetailView } from '@southneuhof/loom'
import { testCasesForSet } from '../../../../test-sets.resource'

const route = useRoute('test-runner-test-sets-detail-cases-detail')
const page = computed(() => testCasesForSet(String(route.params.setId)).detail({ id: String(route.params.caseId) }))
</script>

<template><DetailView v-bind="page" title="Test Case" /></template>
