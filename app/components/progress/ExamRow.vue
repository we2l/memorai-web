<template>
  <li class="flex items-start gap-x-3 py-4 sm:gap-x-4" :data-testid="`exam-${exam.id}`">
    <span class="flex w-14 shrink-0 flex-col items-center rounded-tile bg-soft py-1.5" aria-hidden="true">
      <span class="text-section tabular-nums text-fg-strong">{{ day }}</span>
      <span class="text-label uppercase text-fg-muted">{{ month }}</span>
    </span>

    <div class="flex min-w-0 flex-1 flex-col gap-1">
      <h3 class="flex flex-wrap items-center gap-2 font-semibold break-words text-fg-strong">
        {{ exam.title }}
        <span class="sr-only">, {{ fullDate }}</span>
        <UiTag v-if="exam.reta_final_active" tone="action">Reta final</UiTag>
      </h3>
      <p class="text-meta text-fg-muted">{{ meta }}</p>
      <p v-if="exam.reta_final_active" class="text-meta text-fg-muted">Nos últimos 3 dias, a revisão traz até 20 cards extras dos assuntos da prova.</p>

      <ProgressExamReadiness v-if="future" :readiness="exam.readiness" />

      <!-- Past: "Passou?" (prd-retencao-lembretes F6), or the answer given -->
      <template v-else>
        <p v-if="exam.outcome" class="text-meta text-fg" data-testid="exam-outcome">
          Você respondeu: {{ exam.outcome === 'passed' ? 'passei' : 'não passei' }}.
        </p>
        <div v-else class="flex flex-wrap items-center gap-2" role="group" :aria-label="`Como foi ${exam.title}?`">
          <span class="text-meta text-fg">Como foi?</span>
          <span class="flex gap-2">
            <UiButton size="sm" :loading="saving === 'passed'" @click="emit('outcome', 'passed')">Passei</UiButton>
            <UiButton size="sm" :loading="saving === 'failed'" @click="emit('outcome', 'failed')">Não passei</UiButton>
          </span>
        </div>
      </template>
    </div>

    <UiMenu :items="menu" :label="`Mais ações de ${exam.title}`" />
  </li>
</template>

<script setup lang="ts">
// An exam of the agenda (prd-4f-progresso-v3 RF-F3): the date block, the coverage and the pace, "Reta final"
// with what it does, the readiness (future, prd-prontidao-prova) or "Passei / Não passei" (past), and ⋯ with Editar, the calendar
// of the phone (.ics, Google Agenda), Reta final on/off and Excluir.
import type { MenuItem } from '~/components/ui/Menu.vue'
import type { Exam, ExamOutcome } from '~/types'

const props = defineProps<{ exam: Exam; saving?: ExamOutcome | null }>()
const emit = defineEmits<{ edit: []; delete: []; outcome: [o: ExamOutcome]; reta: []; ics: []; google: [] }>()

const date = computed(() => new Date(`${props.exam.exam_date.slice(0, 10)}T12:00:00`))
const day = computed(() => String(date.value.getDate()).padStart(2, '0'))
const month = computed(() => date.value.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''))
const fullDate = computed(() => date.value.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }))
const future = computed(() => !props.exam.is_past)

function pastText(days: number | null) {
  if (days === 1) return 'foi ontem'
  return days ? `há ${days} dias` : 'já passou'
}

const coverageText = computed(() => {
  const list = props.exam.coverage ?? props.exam.topics.map(t => ({ topic_id: t.id, name: t.name, depth: 0 }))
  const root = list.find(c => c.depth === 0)
  if (root) return `caderno ${root.name}`
  return list.map(c => c.name).join(', ')
})

const meta = computed(() => {
  const d = props.exam.days_remaining
  const when = !future.value ? pastText(props.exam.days_since) : d === 0 ? 'é hoje' : d === 1 ? 'amanhã' : `em ${d} dias`
  const parts = [when, coverageText.value]
  if (future.value && props.exam.cards_per_day) parts.push(`ritmo sugerido ${plural(props.exam.cards_per_day, 'card', 'cards')} por dia`)
  return parts.filter(Boolean).join(' · ')
})

const menu = computed<MenuItem[]>(() => [
  { label: 'Editar', onSelect: () => emit('edit') },
  { label: 'Baixar para a agenda (.ics)', meta: 'celular ou computador', separator: true, onSelect: () => emit('ics') },
  { label: 'Abrir no Google Agenda', onSelect: () => emit('google') },
  ...(future.value ? [{ label: props.exam.reta_final_enabled ? 'Desligar a Reta final' : 'Ligar a Reta final', meta: 'até 20 cards extras nos últimos 3 dias', separator: true, onSelect: () => emit('reta') }] : []),
  { label: 'Excluir', tone: 'danger' as const, separator: true, onSelect: () => emit('delete') },
])
</script>
