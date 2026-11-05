<route>{ "meta": { "permission": "manage-skills-context" } }</route>
<script setup lang="ts">
import { FormView } from '@southneuhof/loom'
import { contextCollections } from './skills-context.resource'
</script>

<template>
  <FormView :form="contextCollections.create.form" title="Create Collection" description="Public collections require Cloudflare OS administrator access." />
</template>
