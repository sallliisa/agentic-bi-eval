<route>{ "meta": { "permission": "execute-test-runs" } }</route>
<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { FormView } from '@southneuhof/loom'
import { testRuns } from '../test-runs.resource'

const route = useRoute('test-runner-test-runs-edit')
const page = computed(() => testRuns.update({ id: String(route.params.runId) }))
</script>

<template><FormView v-bind="page" title="Edit Test Run" /></template>
