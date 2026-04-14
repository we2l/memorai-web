<template>
  <div class="grid grid-cols-4 gap-3 w-full max-w-lg mx-auto">
    <button class="btn-again" :disabled="disabled" @click="onRate(1)" aria-label="Errei — revisar em breve">
      <RotateCcw :size="20" />
      Errei
    </button>
    <button class="btn-hard" :disabled="disabled" @click="onRate(2)" aria-label="Difícil — revisar em pouco tempo">
      <Frown :size="20" />
      Difícil
    </button>
    <button class="btn-good" :disabled="disabled" @click="onRate(3)" aria-label="Bom — revisar normalmente">
      <CheckCircle :size="20" />
      Bom
    </button>
    <button class="btn-easy" :disabled="disabled" @click="onRate(4)" aria-label="Fácil — revisar mais tarde">
      <Sparkles :size="20" />
      Fácil
    </button>
  </div>
</template>

<script setup lang="ts">
import { RotateCcw, Frown, CheckCircle, Sparkles } from 'lucide-vue-next'

defineProps<{ disabled?: boolean }>()
const emit = defineEmits<{ (e: 'rate', rating: number): void }>()

function onRate(rating: number) {
  emit('rate', rating)
}
</script>
