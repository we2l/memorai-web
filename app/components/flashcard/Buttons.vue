<template>
  <div class="grid grid-cols-4 gap-3 w-full max-w-lg mx-auto">
    <button class="btn-again" :disabled="disabled" @click="onRate(1)" :aria-label="`Errei — ${intervals.again}`">
      <RotateCcw :size="20" />
      <span class="flex flex-col items-center">
        <span>Errei</span>
        <span class="text-micro opacity-75">{{ intervals.again }}</span>
      </span>
    </button>
    <button class="btn-hard" :disabled="disabled" @click="onRate(2)" :aria-label="`Difícil — ${intervals.hard}`">
      <Frown :size="20" />
      <span class="flex flex-col items-center">
        <span>Difícil</span>
        <span class="text-micro opacity-75">{{ intervals.hard }}</span>
      </span>
    </button>
    <button class="btn-good" :disabled="disabled" @click="onRate(3)" :aria-label="`Bom — ${intervals.good}`">
      <CheckCircle :size="20" />
      <span class="flex flex-col items-center">
        <span>Bom</span>
        <span class="text-micro opacity-75">{{ intervals.good }}</span>
      </span>
    </button>
    <button class="btn-easy" :disabled="disabled" @click="onRate(4)" :aria-label="`Fácil — ${intervals.easy}`">
      <Sparkles :size="20" />
      <span class="flex flex-col items-center">
        <span>Fácil</span>
        <span class="text-micro opacity-75">{{ intervals.easy }}</span>
      </span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { RotateCcw, Frown, CheckCircle, Sparkles } from 'lucide-vue-next'

const props = defineProps<{
  disabled?: boolean
  intervals: { again: string; hard: string; good: string; easy: string }
}>()

const emit = defineEmits<{ (e: 'rate', rating: number): void }>()

function onRate(rating: number) {
  emit('rate', rating)
}
</script>
