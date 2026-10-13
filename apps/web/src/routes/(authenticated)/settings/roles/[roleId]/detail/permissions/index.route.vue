<route>{ "meta": { "permission": "list-role-permissions" } }</route>
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { toast } from 'vue-sonner'
import { ListView } from '@southneuhof/loom'
import Switch from '@southneuhof/loom/components/inputs/Switch.vue'
import { errorMessage } from '@/framework/adapters/data/normalize'
import type { RolePermission } from './role-permissions.schema'
import { rolePermissions } from './role-permissions.resource'

const route = useRoute('settings-roles-detail-permissions')
const roleId = computed(() => String(route.params.roleId))
const pending = ref(new Map<string, boolean>())
const list = computed(() => ({
  ...rolePermissions.list,
  table: { ...rolePermissions.list.table, searchParameters: { role_id: roleId.value } },
}))

function rowKey(id: string) {
  return `${roleId.value}:${id}`
}

function assigned(row: RolePermission) {
  return pending.value.get(rowKey(row.id)) ?? row.assigned
}

function canToggle(row: RolePermission) {
  return rolePermissions.actions.set.withContext({ record: row }).can(roleId.value, row.id, !row.assigned)
}

async function toggle(row: RolePermission) {
  const key = rowKey(row.id)
  const command = rolePermissions.actions.set.withContext({ record: row })
  if (!command.can(roleId.value, row.id, !row.assigned) || pending.value.has(key)) return
  const next = !row.assigned
  pending.value.set(key, next)
  try {
    await command.run(roleId.value, row.id, next)
  } catch (error) {
    toast.error(errorMessage(error, 'Permission update failed.'))
  } finally {
    pending.value.delete(key)
  }
}
</script>

<template>
  <ListView v-bind="list" title="Permissions" :export="false">
    <template #cell:assigned="{ record }">
      <Switch
        :model-value="assigned(record)"
        v-bind="{ 'aria-label': `Permission ${record.name}`, 'data-permission': record.id }"
        :disabled="!canToggle(record) || pending.has(rowKey(record.id))"
        @update:model-value="toggle(record)"
      />
    </template>
  </ListView>
</template>
