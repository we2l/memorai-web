<template>
  <div class="grid grid-cols-4 gap-3 w-full max-w-lg mx-auto">
    <button
      class="btn-again"
      :disabled="disabled"
      @click="$emit('rate', 1)"
      aria-label="Errei — revisar em breve"
    >
      <RotateCcw :size="20" />
      Again
    </button>
    <button
      class="btn-hard"
      :disabled="disabled"
      @click="$emit('rate', 2)"
      aria-label="Difícil — revisar em pouco tempo"
    >
      <Frown :size="20" />
      Hard
    </button>
    <button
      class="btn-good"
      :disabled="disabled"
      @click="$emit('rate', 3)"
      aria-label="Bom — revisar normalmente"
    >
      <CheckCircle :size="20" />
      Good
    </button>
    <button
      class="btn-easy"
      :disabled="disabled"
      @click="$emit('rate', 4)"
      aria-label="Fácil — revisar mais tarde"
    >
      <Sparkles :size="20" />
      Easy
    </button>
  </div>
</template>

<script setup lang="ts">
import { RotateCcw, Frown, CheckCircle, Sparkles } from 'lucide-vue-next'

defineProps<{ disabled?: boolean }>()
defineEmits<{ rate: [rating: 1 | 2 | 3 | 4] }>()
</script>
