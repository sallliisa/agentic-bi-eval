<route>{ "meta": { "permission": "manage-test-sets" } }</route>
<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { FormView } from '@southneuhof/loom'
import { testCasesForSet } from '../../../test-sets.resource'

const route = useRoute('test-runner-test-sets-detail-cases-create')
const page = computed(() => testCasesForSet(String(route.params.setId)).create)
</script>

<template><FormView v-bind="page" title="Create Test Case" /></template>
