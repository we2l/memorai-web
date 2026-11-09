<template>
  <!-- The one tinted block of the result (ADR-027 §6) -->
  <UiSection variant="tinted" label="Próximo passo" aria-label="Próximo passo" data-testid="quiz-next-step">
    <div class="flex flex-col gap-4">
      <div class="min-w-0" role="status">
        <p class="text-title text-fg-strong">{{ heading }}</p>
        <p class="mt-1 text-meta text-fg-muted">{{ support }}</p>
      </div>
      <div class="flex flex-col gap-2">
        <template v-if="state === 'create'">
          <UiButton variant="primary" block :loading="creating" :disabled="selected === 0" data-testid="quiz-create-cards" @click="emit('create')">
            {{ selected === 0 ? 'Marque os erros' : `Criar ${plural(selected, 'card', 'cards')}` }}
          </UiButton>
          <UiButton v-if="scopeTo" variant="outline" block :to="scopeTo">Ver a matéria</UiButton>
        </template>
        <template v-else-if="state === 'review'">
          <UiButton variant="primary" block :to="reviewTo" data-testid="quiz-review-now" @click="emit('review')">
            Revisar {{ sessionCount === 1 ? 'o card' : `os ${sessionCount}` }} agora
          </UiButton>
          <UiButton v-if="scopeTo" variant="outline" block :to="scopeTo">Voltar a {{ scopeName }}</UiButton>
        </template>
        <template v-else>
          <UiButton variant="primary" block :to="newQuizTo">Novas questões</UiButton>
          <UiButton v-if="scopeTo" variant="outline" block :to="scopeTo">Voltar a {{ scopeName }}</UiButton>
        </template>
      </div>
    </div>
  </UiSection>
</template>

<script setup lang="ts">
// Next step of the result (prd-4e-praticar-v3 RF-F4.4): "Criar N cards" while there are errors without a card,
// then "Revisar os N agora" (scope=quiz:, exactly these cards, F2), or new questions when nothing went wrong.
const props = defineProps<{
  state: 'create' | 'review' | 'done'
  selected: number
  /** Cards of the errors (all of them, created now or before) */
  cardsCount: number
  sessionCount: number
  creating?: boolean
  reviewTo: string
  newQuizTo: string
  scopeTo?: string | null
  scopeName?: string | null
}>()
const emit = defineEmits<{ create: []; review: [] }>()

const heading = computed(() => {
  if (props.state === 'create') return props.selected ? `Criar ${plural(props.selected, 'card', 'cards')} e revisar` : 'Escolha os erros que viram cards'
  if (props.state === 'review') return `${plural(props.cardsCount, 'card', 'cards')} no assunto certo`
  return 'Nenhum erro para virar card'
})
const support = computed(() => {
  if (props.state === 'create') return 'Cada card entra no assunto da questão e na sua revisão.'
  if (props.state === 'review') return props.sessionCount ? 'Revise agora só estes cards, fora do limite de novos do dia.' : 'Eles entram na revisão do caderno nos próximos dias.'
  return 'Continue treinando para manter o acerto.'
})
</script>
