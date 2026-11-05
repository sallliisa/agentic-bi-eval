<route>{ "meta": { "permission": "view-connectors" } }</route>
<script setup lang="ts">
import { ListView } from '@southneuhof/loom'
import { connectors } from './connectors.resource'
</script>

<template>
  <ListView v-bind="connectors.list" title="Connectors" />
</template>
