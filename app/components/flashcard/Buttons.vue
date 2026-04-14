<template>
  <div class="grid grid-cols-4 gap-3 w-full max-w-lg mx-auto">
    <button class="btn-again" :disabled="disabled" @click="onRate(1)" :aria-label="labels[0]">
      <RotateCcw :size="20" />
      <span class="flex flex-col items-center">
        <span>Errei</span>
        <span v-if="intervals[0]" class="text-micro opacity-75">{{ intervals[0] }}</span>
      </span>
    </button>
    <button class="btn-hard" :disabled="disabled" @click="onRate(2)" :aria-label="labels[1]">
      <Frown :size="20" />
      <span class="flex flex-col items-center">
        <span>Difícil</span>
        <span v-if="intervals[1]" class="text-micro opacity-75">{{ intervals[1] }}</span>
      </span>
    </button>
    <button class="btn-good" :disabled="disabled" @click="onRate(3)" :aria-label="labels[2]">
      <CheckCircle :size="20" />
      <span class="flex flex-col items-center">
        <span>Bom</span>
        <span v-if="intervals[2]" class="text-micro opacity-75">{{ intervals[2] }}</span>
      </span>
    </button>
    <button class="btn-easy" :disabled="disabled" @click="onRate(4)" :aria-label="labels[3]">
      <Sparkles :size="20" />
      <span class="flex flex-col items-center">
        <span>Fácil</span>
        <span v-if="intervals[3]" class="text-micro opacity-75">{{ intervals[3] }}</span>
      </span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { RotateCcw, Frown, CheckCircle, Sparkles } from 'lucide-vue-next'
import type { Flashcard } from '~/types'

const props = defineProps<{
  disabled?: boolean
  card?: Flashcard | null
  learningSteps?: number[]
  relearningSteps?: number[]
}>()

const emit = defineEmits<{ (e: 'rate', rating: number): void }>()

function onRate(rating: number) {
  emit('rate', rating)
}

function formatMinutes(m: number): string {
  if (m < 60) return `${m}min`
  return `${Math.round(m / 60)}h`
}

const isLearning = computed(() => props.card?.is_learning ?? false)

const intervals = computed(() => {
  if (!isLearning.value || !props.card) return ['', '', '', '']

  const steps = props.card.state === 'relearning'
    ? (props.relearningSteps ?? [10])
    : (props.learningSteps ?? [1, 10])

  const idx = props.card.learning_step_index ?? 0

  // Again: step[0], Hard: step[current], Good: step[next] or graduate, Easy: graduate
  const again = steps.length ? formatMinutes(steps[0]) : ''
  const hard = steps.length ? formatMinutes(steps[idx] ?? steps[0]) : ''
  const nextIdx = idx + 1
  const good = nextIdx < steps.length ? formatMinutes(steps[nextIdx]) : ''
  const easy = '' // Easy always graduates

  return [again, hard, good, easy]
})

const labels = computed(() => [
  `Errei${intervals.value[0] ? ` — ${intervals.value[0]}` : ''}`,
  `Difícil${intervals.value[1] ? ` — ${intervals.value[1]}` : ''}`,
  `Bom${intervals.value[2] ? ` — ${intervals.value[2]}` : ''}`,
  `Fácil — pular aprendizado`,
])
</script>
