<template>
  <UiSection data-testid="quiz-answer-key">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h2 class="text-section text-fg-strong">Gabarito</h2>
      <UiButton size="sm" variant="ghost" :icon-right="open ? ChevronUp : ChevronDown" :aria-expanded="open" :aria-controls="panelId" @click="open = !open">
        {{ open ? 'Esconder' : `Ver as ${questions.length} questões` }}
      </UiButton>
    </div>
    <div v-if="open" :id="panelId" class="mt-3">
      <LazyQuizAnswerList :questions="questions" @ask="emit('ask', $event)" />
    </div>
  </UiSection>
</template>

<script setup lang="ts">
// The answer key of a finished quiz (prd-4e-praticar-v3 RF-F4.5), folded by default: every question or only
// the wrong ones, the explanation, the correction of the short answers and "Por que errei?". "#q7" (the origin
// of a card in the review) opens it on that question. The list is its own chunk, fetched when it opens.
import { ChevronDown, ChevronUp } from 'lucide-vue-next'
import type { QuizQuestion } from '~/types'

const props = defineProps<{ questions: QuizQuestion[]; initiallyOpen?: boolean }>()
const emit = defineEmits<{ ask: [q: QuizQuestion] }>()

const panelId = useId()
const open = ref(!!props.initiallyOpen)

defineExpose({ open: () => { open.value = true } })
</script>
