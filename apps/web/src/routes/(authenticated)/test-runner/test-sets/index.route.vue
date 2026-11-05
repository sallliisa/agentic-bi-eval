<route>{ "meta": { "permission": "view-test-sets" } }</route>
<script setup lang="ts">
import { ListView } from '@southneuhof/loom'
import { testSets } from './test-sets.resource'
</script>

<template><ListView v-bind="testSets.list" title="Test Sets" /></template>
