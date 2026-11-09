<template>
  <!-- What the caderno still needs, said before the action (prd-caderno-f1-pontes RF-F5) -->
  <p v-if="text" role="status" class="flex items-start gap-2 rounded-row bg-soft px-3 py-2 text-meta text-fg">
    <Lock class="mt-0.5 size-4 shrink-0 text-fg-muted" aria-hidden="true" />
    <span>{{ text }}</span>
  </p>
</template>

<script setup lang="ts">
import { Lock } from 'lucide-vue-next'
import { requirementText, type StudyGate } from '~/utils/studyRequirement'

const props = defineProps<{ gate: StudyGate | null | undefined }>()
const text = computed(() => requirementText(props.gate))
</script>
