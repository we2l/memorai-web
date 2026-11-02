<template>
  <p class="flex flex-wrap items-center gap-x-1.5 text-meta text-fg-muted" data-testid="material-source">
    <FileText class="size-4 shrink-0" aria-hidden="true" />
    <span>Da apostila <span class="font-medium text-fg">{{ name }}</span><template v-if="range">, {{ range }}</template></span>
    <span aria-hidden="true">·</span>
    <button type="button" class="min-h-touch font-medium text-action-fg underline-offset-2 hover:underline" data-testid="material-open-pdf" @click="$emit('open-pdf', pageStart ?? null)">
      Ver no PDF<template v-if="pageStart"> (p. {{ pageStart }})</template>
    </button>
  </p>
</template>

<script setup lang="ts">
// Where the text came from (prd-4c-material-v3 RF-F2/RF-F16): "Da apostila X, p. 73–102 · Ver no PDF
// (p. 73)". The pages arrive with the parts (4c-2); until then the PDF opens on its first page.
import { FileText } from 'lucide-vue-next'
import { documentTitle } from '~/utils/cardState'

const props = defineProps<{ documentName: string; pageStart?: number | null; pageEnd?: number | null }>()
defineEmits<{ (e: 'open-pdf', page: number | null): void }>()

const name = computed(() => documentTitle(props.documentName))
const range = computed(() => {
  if (!props.pageStart) return ''
  return props.pageEnd && props.pageEnd !== props.pageStart ? `p. ${props.pageStart}–${props.pageEnd}` : `p. ${props.pageStart}`
})
</script>
