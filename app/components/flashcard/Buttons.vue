<template>
  <div class="w-full max-w-2xl mx-auto">
    <!-- Mobile: 2x2 with Bom highlighted -->
    <div class="grid grid-cols-2 gap-3 sm:hidden">
      <button class="btn-again" :disabled="disabled" @click="onRate(1)" :aria-label="`Errei — ${intervals.again}`">
        <RotateCcw :size="18" />
        <span>Errei</span>
        <span class="text-micro opacity-50">{{ intervals.again }}</span>
      </button>
      <button class="btn-good ring-1 ring-[#6A994E]/30" :disabled="disabled" @click="onRate(3)" :aria-label="`Bom — ${intervals.good}`">
        <CheckCircle :size="18" />
        <span>Bom</span>
        <span class="text-micro opacity-50">{{ intervals.good }}</span>
      </button>
      <button class="btn-hard" :disabled="disabled" @click="onRate(2)" :aria-label="`Difícil — ${intervals.hard}`">
        <Frown :size="18" />
        <span>Difícil</span>
        <span class="text-micro opacity-50">{{ intervals.hard }}</span>
      </button>
      <button class="btn-easy" :disabled="disabled" @click="onRate(4)" :aria-label="`Fácil — ${intervals.easy}`">
        <Sparkles :size="18" />
        <span>Fácil</span>
        <span class="text-micro opacity-50">{{ intervals.easy }}</span>
      </button>
    </div>

    <!-- Desktop: 4 cols with Bom highlighted -->
    <div class="hidden sm:grid grid-cols-4 gap-3">
      <button class="btn-again" :disabled="disabled" @click="onRate(1)" :aria-label="`Errei — ${intervals.again}`">
        <RotateCcw :size="18" />
        <span>Errei</span>
        <span class="text-micro opacity-50">{{ intervals.again }}</span>
      </button>
      <button class="btn-hard" :disabled="disabled" @click="onRate(2)" :aria-label="`Difícil — ${intervals.hard}`">
        <Frown :size="18" />
        <span>Difícil</span>
        <span class="text-micro opacity-50">{{ intervals.hard }}</span>
      </button>
      <button class="btn-good ring-1 ring-[#6A994E]/30" :disabled="disabled" @click="onRate(3)" :aria-label="`Bom — ${intervals.good}`">
        <CheckCircle :size="18" />
        <span>Bom</span>
        <span class="text-micro opacity-50">{{ intervals.good }}</span>
      </button>
      <button class="btn-easy" :disabled="disabled" @click="onRate(4)" :aria-label="`Fácil — ${intervals.easy}`">
        <Sparkles :size="18" />
        <span>Fácil</span>
        <span class="text-micro opacity-50">{{ intervals.easy }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { RotateCcw, Frown, CheckCircle, Sparkles } from 'lucide-vue-next'

defineProps<{
  disabled?: boolean
  intervals: { again: string; hard: string; good: string; easy: string }
}>()

const emit = defineEmits<{ (e: 'rate', rating: number): void }>()

function onRate(rating: number) {
  emit('rate', rating)
}
</script>
