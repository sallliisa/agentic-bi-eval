<route>{ "meta": { "permission": "view-model-providers" } }</route>
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ListView } from '@southneuhof/loom'
import { toast } from 'vue-sonner'
import { modelProvidersActions } from './model-providers.actions'
import { gatewayProvidersTable, modelRecords } from './model-providers.resource'

const snapshot = ref<Awaited<ReturnType<typeof modelProvidersActions.listAll>>>()

onMounted(async () => {
  try {
    snapshot.value = await modelProvidersActions.listAll()
  } catch {
    toast.error('Could not load model provider details.')
  }
})

async function loadProviders() {
  const result = snapshot.value ?? (await modelProvidersActions.listAll())
  snapshot.value = result
  return { data: result.gatewayProviders, meta: { total: result.gatewayProviders.length, page: 1, pageSize: result.gatewayProviders.length, totalPage: result.gatewayProviders.length ? 1 : 0 } }
}

const providers = computed(() => ({
  table: {
    ...gatewayProvidersTable,
    resource: 'cloudflare-os-gateway-providers',
    pagination: false as const,
    load: loadProviders,
  },
}))
const providerRows = computed(() => snapshot.value?.gatewayProviders ?? [])
</script>

<template>
  <div class="flex flex-col gap-2">
    <section v-if="snapshot?.gatewayStatus === 'active'" class="flex flex-col gap-2">
      <h2 class="text-lg font-medium">AI Gateway Providers</h2>
      <ListView v-bind="providers" title="AI Gateway Providers" />
      <p v-if="providerRows.length === 0" class="px-4 text-sm text-on-surface-variant">No gateway providers are configured.</p>
    </section>
    <ListView v-bind="modelRecords.list" title="Models" />
  </div>
</template>
