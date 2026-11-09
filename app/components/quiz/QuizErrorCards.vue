<template>
  <UiSection :title="title" description="Cada card nasce do enunciado e do comentário da questão e entra no assunto dela. Desmarque o que não quiser." data-testid="quiz-error-cards">
    <ul class="divide-y divide-hairline">
      <li v-for="e in visible" :key="e.question_id" class="py-2" :data-testid="`error-card-${e.number}`">
        <!-- Already a card: no longer a choice (a dimmed, disabled box would fail the contrast) -->
        <p v-if="e.card_id" class="flex min-h-touch items-center gap-3 py-2.5 text-body text-fg-strong" data-testid="error-card-done">
          <CheckCircle2 class="size-5 shrink-0 text-success" aria-hidden="true" />
          <span><span class="font-semibold">Q{{ e.number }}</span><template v-if="e.topic_name"> · {{ e.topic_name }}</template> <span class="text-meta text-fg-muted">· já virou card</span></span>
        </p>
        <UiCheckbox
          v-else
          :model-value="modelValue.includes(e.question_id)"
          @update:model-value="toggle(e.question_id, $event)"
        >
          <span class="font-semibold">Q{{ e.number }}</span><template v-if="e.topic_name"> · {{ e.topic_name }}</template>
        </UiCheckbox>
        <p class="ml-8 rounded-row bg-soft px-3 py-2 text-meta text-fg">
          <span class="font-semibold text-fg-strong">Frente:</span> {{ e.front }}
          <span aria-hidden="true"> · </span>
          <span class="font-semibold text-fg-strong">Verso:</span> {{ e.back }}
        </p>
      </li>
    </ul>
    <UiButton v-if="hidden > 0" size="sm" variant="ghost" class="mt-2 -ml-3" :aria-expanded="false" @click="all = true">+ {{ plural(hidden, 'erro', 'erros') }}</UiButton>
  </UiSection>
</template>

<script setup lang="ts">
// Errors → cards (prd-4e-praticar-v3 RF-F4.3, RF-B6): the preview of `error_cards_preview` (the same builder
// as create-cards, no AI), each one checked by default; the ones that already became a card say so (no longer a
// choice). Up to 5 visible and "+ N erros".
import { CheckCircle2 } from 'lucide-vue-next'
import type { QuizErrorCard } from '~/types'

const props = defineProps<{ errors: QuizErrorCard[]; modelValue: string[] }>()
const emit = defineEmits<{ 'update:modelValue': [ids: string[]] }>()

const all = ref(false)
const visible = computed(() => (all.value ? props.errors : props.errors.slice(0, 5)))
const hidden = computed(() => props.errors.length - visible.value.length)
const title = computed(() => `${props.errors.length === 1 ? 'Seu erro vira card' : `Seus ${props.errors.length} erros viram cards`}`)

function toggle(id: string, on: boolean) {
  const set = new Set(props.modelValue)
  if (on) set.add(id)
  else set.delete(id)
  emit('update:modelValue', props.errors.filter(e => set.has(e.question_id)).map(e => e.question_id))
}
</script>
