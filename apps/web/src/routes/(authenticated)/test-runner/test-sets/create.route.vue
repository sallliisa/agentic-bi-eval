<route>{ "meta": { "permission": "manage-test-sets" } }</route>
<script setup lang="ts">
import { FormView } from '@southneuhof/loom'
import { testSets } from './test-sets.resource'
</script>

<template><FormView v-bind="testSets.create" title="Create Test Set" /></template>
