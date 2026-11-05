<route>{ "meta": { "permission": "view-model-providers" } }</route>
<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { DetailView } from '@southneuhof/loom'
import { modelRecords } from '../model-providers.resource'

const route = useRoute('settings-model-providers-detail')
const page = computed(() => modelRecords.detail({ id: String(route.params.modelKey) }))
</script>

<template>
  <DetailView v-bind="page" title="Model Details" />
</template>
