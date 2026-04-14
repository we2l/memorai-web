<template>
  <div
    class="w-full max-w-lg mx-auto cursor-pointer select-none"
    @click="$emit('flip')"
    role="button"
    :aria-label="flipped ? 'Verso do card' : 'Toque para ver a resposta'"
  >
    <div class="relative" style="perspective: 1000px">
      <Transition name="flip" mode="out-in">
        <div
          :key="flipped ? 'back' : 'front'"
          class="bg-surface-secondary rounded-2xl p-8 min-h-[250px] flex flex-col items-center justify-center text-center"
        >
          <p v-if="!flipped" class="text-label mb-3">{{ deckName }}</p>
          <p class="text-xl font-medium text-base-primary leading-relaxed">
            {{ flipped ? card.back : card.front }}
          </p>
        </div>
      </Transition>
    </div>

    <p v-if="!flipped" class="text-base-muted text-micro text-center mt-4">
      ● Toque no card para ver a resposta
    </p>
  </div>
</template>

<script setup lang="ts">
import type { Flashcard } from '~/types'

defineProps<{
  card: Flashcard
  flipped: boolean
  deckName?: string
}>()

defineEmits<{
  flip: []
}>()
</script>

<style scoped>
.flip-enter-active,
.flip-leave-active {
  transition: all 150ms ease-in-out;
}
.flip-enter-from {
  opacity: 0;
  transform: rotateX(10deg);
}
.flip-leave-to {
  opacity: 0;
  transform: rotateX(-10deg);
}
</style>
