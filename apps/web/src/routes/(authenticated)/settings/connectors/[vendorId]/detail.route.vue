<route>{ "meta": { "permission": "view-connectors" } }</route>
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { DetailView, ListView } from '@southneuhof/loom'
import { toast } from 'vue-sonner'
import { connectorsActions } from '../connectors.actions'
import { connectorResourceTable, connectors } from '../connectors.resource'
import { connectorDisplaySchema } from '../connectors.schema'

const route = useRoute('settings-connectors-detail')
const vendorId = computed(() => String(route.params.vendorId))
const connector = ref<ReturnType<typeof connectorDisplaySchema.parse>>()
const page = computed(() => connectors.detail({ id: vendorId.value }))
const resources = computed(() => ({
  table: {
    ...connectorResourceTable,
    resource: `cloudflare-os-connector-resources-${vendorId.value}`,
    pagination: false as const,
    load: async () => {
      const data = connector.value?.resources ?? []
      return { data, meta: { total: data.length, page: 1, pageSize: data.length, totalPage: data.length ? 1 : 0 } }
    },
  },
}))

watch(
  vendorId,
  async (id) => {
    connector.value = undefined
    try {
      connector.value = await connectorsActions.detail(id)
    } catch {
      toast.error('Could not load connector availability.')
    }
  },
  { immediate: true }
)
</script>

<template>
  <div class="flex flex-col gap-2">
    <DetailView v-bind="page" title="Connector Details" />
    <p v-if="connector?.autoProvisions" class="rounded-lg bg-surface-container px-4 py-3 text-sm text-on-surface">
      This connector uses ambient provisioning. The deployment reports its current mode as {{ connector.ambientMode }}.
    </p>
    <ListView v-if="connector && !connector.autoProvisions" v-bind="resources" title="Advertised Resource Types" />
  </div>
</template>
