<route>{ "meta": { "permission": "view-agent-instructions" } }</route>
<script setup lang="ts">
import { computed } from 'vue'
import { defineForm, Form, invalidateResourceData, useFrameworkQueryClient } from '@southneuhof/loom'
import Card from '@southneuhof/loom/components/base/Card.vue'
import Button from '@southneuhof/loom/components/base/Button.vue'
import { toast } from 'vue-sonner'
import { appLabels } from '@/configs/labels'
import { permissions } from '@/stores/permissions'
import { instructionRecordSchema } from '@southneuhof/api/src/routes/(authenticated)/cloudflare-os/schema.ts'
import { agentInstructionsActions } from './agent-instructions.actions'

const resourceKey = 'cloudflare-os-agent-instructions'
const queryClient = useFrameworkQueryClient()
const access = permissions()
const canManage = computed(() => access.can('manage-agent-instructions'))
const baseForm = defineForm({
  schema: instructionRecordSchema,
  labels: { ...appLabels, text: 'Instructions' },
  fields: { text: { renderer: 'textarea' } },
})

async function save(input: { text: string }) {
  const result = await agentInstructionsActions.update(input)
  try {
    await invalidateResourceData(queryClient, { resource: resourceKey })
    toast.success('Instructions saved.')
  } catch {
    toast.warning('Instructions were saved, but the page could not refresh.')
  }
  return result
}

const form = computed(() => ({
  ...baseForm,
  load: agentInstructionsActions.read,
  resource: resourceKey,
  submit: save,
  disabled: !canManage.value,
}))
</script>

<template>
  <section class="flex flex-col gap-2">
    <Card variant="outlined" color="surfaceContainer" class="px-5 py-4 sm:px-6 sm:py-5">
      <h1 class="text-lg font-semibold leading-6 tracking-tight text-on-surface">Agent Instructions</h1>
    </Card>
    <Card variant="outlined" color="surfaceContainer" class="p-0">
      <div class="p-5 sm:p-6">
        <Form v-bind="form">
          <template #actions="{ submitPending, inputPending, postWriteError }">
            <div class="flex justify-end">
              <Button type="submit" :disabled="!canManage || submitPending || inputPending || postWriteError !== undefined">Submit</Button>
            </div>
          </template>
        </Form>
      </div>
    </Card>
  </section>
</template>
