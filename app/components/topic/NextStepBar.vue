<template>
  <Transition name="fade">
    <div v-if="visible" class="next-step-bar">
      <!-- Improve -->
      <template v-if="step === 'improve'">
        <div class="flex items-center gap-2 flex-1 min-w-0">
          <Sparkles :size="16" class="text-[var(--color-accent-soft)] shrink-0" />
          <p class="text-small text-base-primary truncate">💡 {{ copyText }}</p>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <button class="btn-primary !py-1.5 !px-3 !min-h-0 text-small" @click="$emit('improve')">
            Estruturar nota
          </button>
          <button class="p-1 rounded text-base-muted hover:text-base-primary transition-colors" @click="$emit('dismiss')" title="Dispensar">
            <X :size="14" />
          </button>
        </div>
      </template>

      <!-- Cards -->
      <template v-else-if="step === 'cards'">
        <div class="flex items-center gap-2 flex-1 min-w-0">
          <Sparkles :size="16" class="text-[var(--color-accent-soft)] shrink-0" />
          <p class="text-small text-base-primary truncate">💡 {{ copyText }}</p>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <button class="btn-primary !py-1.5 !px-3 !min-h-0 text-small" @click="$emit('generate-cards')">
            Transformar em flashcards
          </button>
          <button class="p-1 rounded text-base-muted hover:text-base-primary transition-colors" @click="$emit('dismiss')" title="Dispensar">
            <X :size="14" />
          </button>
        </div>
      </template>

      <!-- Review -->
      <template v-else-if="step === 'review'">
        <div class="flex items-center gap-2 flex-1 min-w-0">
          <Sparkles :size="16" class="text-[var(--color-accent-soft)] shrink-0" />
          <p class="text-small text-base-primary truncate">💡 {{ copyText }}</p>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <button class="btn-primary !py-1.5 !px-3 !min-h-0 text-small" @click="$emit('review')">
            Revisar agora
          </button>
          <button class="p-1 rounded text-base-muted hover:text-base-primary transition-colors" @click="$emit('dismiss')" title="Dispensar">
            <X :size="14" />
          </button>
        </div>
      </template>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { Sparkles, X } from 'lucide-vue-next'

defineProps<{
  visible: boolean
  step: 'improve' | 'cards' | 'review' | null
  copyText: string
}>()

defineEmits<{
  improve: []
  'generate-cards': []
  review: []
  dismiss: []
}>()
</script>

<style scoped>
.next-step-bar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 1.25rem;
  border-radius: 0.75rem;
  margin-bottom: 1rem;
  background: var(--color-primary-50, #F5F2FF);
  border: 1px solid color-mix(in srgb, var(--color-accent-primary) 15%, transparent);
}

:root.dark .next-step-bar {
  background: color-mix(in srgb, var(--color-accent-soft) 8%, transparent);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
