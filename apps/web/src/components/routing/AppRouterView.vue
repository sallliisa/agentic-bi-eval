<script setup lang="ts">
import { computed, inject, unref } from 'vue'
import { RouterView, useRoute, useRouter, viewDepthKey } from 'vue-router'
import type { RouteNamedMap } from 'vue-router/auto-routes'
import Spinner from '@southneuhof/loom/components/base/Spinner.vue'
import { keyManager } from '@/stores/keyManager'

const route = useRoute()
const router = useRouter()
const viewDepth = inject(viewDepthKey, 0)

const renderedRecord = computed(() => {
  let depth = unref(viewDepth)
  while (route.matched[depth] && !route.matched[depth].components) depth++
  return route.matched[depth]
})

const routeViewKey = computed(() => {
  const record = renderedRecord.value
  if (!record) return 'unmatched'
  if (record.name == null) {
    const params = [...record.path.matchAll(/:([A-Za-z0-9_]+)/g)].map(([, name]) => route.params[name])
    return `${record.path}:${JSON.stringify(params)}`
  }

  const name = String(record.name)
  const path = router.resolve({ name: record.name as keyof RouteNamedMap }).path
  return `${name}:${path}:${String(keyManager().value[name])}`
})
</script>

<template>
  <RouterView v-slot="{ Component }">
    <Transition name="vfade" mode="out-in" appear>
      <div v-if="Component" :key="routeViewKey">
        <Suspense :timeout="0">
          <component :is="Component" />
          <template #fallback>
            <div class="flex items-center justify-center">
              <Spinner />
            </div>
          </template>
        </Suspense>
      </div>
      <div v-else-if="$slots.default" key="default">
        <slot />
      </div>
    </Transition>
  </RouterView>
</template>
