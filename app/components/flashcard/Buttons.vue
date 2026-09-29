<template>
  <div class="w-full max-w-2xl mx-auto">
    <!-- Mobile: 2x2 with Lembrei highlighted -->
    <div class="grid grid-cols-2 gap-3 sm:hidden">
      <button class="btn-again" :disabled="disabled" @click="onRate(1)" :aria-label="`Não lembrei — ${intervals.again}`">
        <span class="text-lg" aria-hidden="true">😵</span>
        <span>Não lembrei</span>
        <span class="text-micro opacity-50">{{ intervals.again }}</span>
        <kbd class="kbd-hint" aria-hidden="true">1</kbd>
      </button>
      <button class="btn-good ring-1 ring-[#6A994E]/30" :disabled="disabled" @click="onRate(3)" :aria-label="`Lembrei — ${intervals.good}`">
        <CheckCircle2 :size="18" class="text-[var(--badge-success-text)]" aria-hidden="true" />
        <span>Lembrei</span>
        <span class="text-micro opacity-50">{{ intervals.good }}</span>
        <kbd class="kbd-hint" aria-hidden="true">3</kbd>
      </button>
      <button class="btn-hard" :disabled="disabled" @click="onRate(2)" :aria-label="`Quase — ${intervals.hard}`">
        <span class="text-lg" aria-hidden="true">🤔</span>
        <span>Quase</span>
        <span class="text-micro opacity-50">{{ intervals.hard }}</span>
        <kbd class="kbd-hint" aria-hidden="true">2</kbd>
      </button>
      <button class="btn-easy" :disabled="disabled" @click="onRate(4)" :aria-label="`Fácil demais — ${intervals.easy}`">
        <Flame :size="18" class="text-[var(--badge-warning-text)]" aria-hidden="true" />
        <span>Fácil demais</span>
        <span class="text-micro opacity-50">{{ intervals.easy }}</span>
        <kbd class="kbd-hint" aria-hidden="true">4</kbd>
      </button>
    </div>

    <!-- Desktop: 4 cols with Lembrei highlighted -->
    <div class="hidden sm:grid grid-cols-4 gap-3">
      <button class="btn-again" :disabled="disabled" @click="onRate(1)" :aria-label="`Não lembrei — ${intervals.again}`">
        <span class="text-lg" aria-hidden="true">😵</span>
        <span>Não lembrei</span>
        <span class="text-micro opacity-50">{{ intervals.again }}</span>
        <kbd class="kbd-hint" aria-hidden="true">1</kbd>
      </button>
      <button class="btn-hard" :disabled="disabled" @click="onRate(2)" :aria-label="`Quase — ${intervals.hard}`">
        <span class="text-lg" aria-hidden="true">🤔</span>
        <span>Quase</span>
        <span class="text-micro opacity-50">{{ intervals.hard }}</span>
        <kbd class="kbd-hint" aria-hidden="true">2</kbd>
      </button>
      <button class="btn-good ring-1 ring-[#6A994E]/30" :disabled="disabled" @click="onRate(3)" :aria-label="`Lembrei — ${intervals.good}`">
        <CheckCircle2 :size="18" class="text-[var(--badge-success-text)]" aria-hidden="true" />
        <span>Lembrei</span>
        <span class="text-micro opacity-50">{{ intervals.good }}</span>
        <kbd class="kbd-hint" aria-hidden="true">3</kbd>
      </button>
      <button class="btn-easy" :disabled="disabled" @click="onRate(4)" :aria-label="`Fácil demais — ${intervals.easy}`">
        <Flame :size="18" class="text-[var(--badge-warning-text)]" aria-hidden="true" />
        <span>Fácil demais</span>
        <span class="text-micro opacity-50">{{ intervals.easy }}</span>
        <kbd class="kbd-hint" aria-hidden="true">4</kbd>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CheckCircle2, Flame } from 'lucide-vue-next'
defineProps<{
  disabled?: boolean
  intervals: { again: string; hard: string; good: string; easy: string }
}>()

const emit = defineEmits<{ (e: 'rate', rating: number): void }>()

function onRate(rating: number) {
  emit('rate', rating)
}
</script>

<style scoped>
.kbd-hint {
  display: none;
}
@media (pointer: fine) {
  .kbd-hint {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.25rem;
    height: 1.25rem;
    padding: 0 0.25rem;
    border-radius: 0.25rem;
    border: 1px solid var(--border-hover);
    font-size: 0.6875rem;
    font-family: ui-monospace, monospace;
    color: var(--text-muted);
  }
}
</style>
