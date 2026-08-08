<template>
  <div class="mx-4 mb-3">
    <button
      class="flex items-center gap-2 text-small text-base-muted hover:text-base-primary transition-colors"
      @click="isOpen = !isOpen"
    >
      <ChevronRight :size="14" class="transition-transform" :class="{ 'rotate-90': isOpen }" />
      <span class="font-medium">Ferramentas IA</span>
    </button>

    <div v-if="isOpen" class="mt-2 space-y-1.5 pl-5">
      <button
        class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-secondary transition-colors text-left"
        @click="$emit('podcast')"
      >
        <Headphones :size="16" class="text-[var(--color-accent-soft)] shrink-0" />
        <div class="flex-1 min-w-0">
          <p class="text-small text-base-primary font-medium">Podcast dos seus erros</p>
          <p class="text-micro text-base-muted">Revise ouvindo no ônibus</p>
        </div>
      </button>

      <button
        class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-secondary transition-colors text-left"
        @click="$emit('quiz')"
      >
        <ClipboardList :size="16" class="text-[var(--color-accent-soft)] shrink-0" />
        <div class="flex-1 min-w-0">
          <p class="text-small text-base-primary font-medium">Simulado</p>
          <p class="text-micro text-base-muted">Questões geradas pela IA</p>
        </div>
      </button>

      <button
        class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-secondary transition-colors text-left"
        @click="$emit('mindmap')"
      >
        <Brain :size="16" class="text-[var(--color-accent-soft)] shrink-0" />
        <div class="flex-1 min-w-0">
          <p class="text-small text-base-primary font-medium">Mapa mental</p>
          <p class="text-micro text-base-muted">Visualize as conexões</p>
        </div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ChevronRight, Headphones, ClipboardList, Brain } from 'lucide-vue-next'

const props = defineProps<{
  storageKey?: string
}>()

defineEmits<{
  (e: 'podcast'): void
  (e: 'quiz'): void
  (e: 'mindmap'): void
}>()

const isOpen = ref(false)

// Persist collapsed state
onMounted(() => {
  if (props.storageKey && import.meta.client) {
    isOpen.value = localStorage.getItem(props.storageKey) === 'true'
  }
})

watch(isOpen, (val) => {
  if (props.storageKey && import.meta.client) {
    localStorage.setItem(props.storageKey, String(val))
  }
})
</script>
