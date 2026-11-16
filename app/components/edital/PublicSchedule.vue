<template>
  <div class="public-schedule grid gap-6" data-testid="edital-schedule">
    <div class="flex min-w-0 flex-col gap-5">
      <UiSection aria-labelledby="schedule-hours-title">
        <h2 id="schedule-hours-title" class="text-title font-semibold text-fg-strong">Quantas horas por dia?</h2>
        <div class="mt-3 grid grid-cols-3 gap-3">
          <UiSelect :model-value="String(state.hours[1])" :options="HOUR_OPTIONS" label="Seg a sex" data-testid="edital-schedule-weekday" @update:model-value="v => setWeekdays(Number(v))" />
          <UiSelect :model-value="String(state.hours[6])" :options="HOUR_OPTIONS" label="Sábado" @update:model-value="v => setDay(6, Number(v))" />
          <UiSelect :model-value="String(state.hours[0])" :options="HOUR_OPTIONS" label="Domingo" @update:model-value="v => setDay(0, Number(v))" />
        </div>
        <div class="mt-4">
          <p class="mb-2 text-meta font-semibold text-fg-strong">Sessão</p>
          <UiSegmented :model-value="state.sessionMinutes" :options="SESSIONS" label="Tamanho da sessão" @update:model-value="v => patch({ sessionMinutes: Number(v) })" />
        </div>
        <UiInput
          v-if="!editalDate"
          :model-value="state.examDate ?? ''"
          class="mt-4"
          type="date"
          label="Data da prova"
          optional
          hint="Sem data, o cronograma é só a ordem dos assuntos."
          :min="tomorrow"
          data-testid="edital-schedule-date"
          @update:model-value="v => patch({ examDate: /^\d{4}-\d{2}-\d{2}$/.test(v) && v > today ? v : null })"
        />
        <p class="mt-4 text-meta text-fg-muted" data-testid="edital-schedule-weights">{{ weightsText }}</p>
        <UiButton variant="ghost" size="sm" class="mt-1" data-testid="edital-schedule-adjust" @click="openSheet">Ajustar dia a dia e o peso</UiButton>
      </UiSection>

      <p class="text-body text-fg" role="status" data-testid="edital-schedule-summary">{{ summaryLine }}</p>

      <UiSection v-if="schedule.overflow" variant="tile" data-testid="edital-schedule-overflow">
        <p class="text-body font-semibold text-fg-strong">{{ overflowTitle }}</p>
        <p class="mt-1 text-body text-fg">Ponha mais horas na semana, use sessões de 30 min ou junte dois assuntos curtos da mesma matéria.</p>
      </UiSection>

      <ScheduleWeek v-if="schedule.summary.calendar" :schedule="schedule" :today="today" :grid="false" />
      <UiSection v-else title="A ordem dos assuntos" data-testid="edital-schedule-queue">
        <ol class="flex flex-col divide-y divide-hairline">
          <li v-for="(s, i) in schedule.sessions.slice(0, 20)" :key="s.id" class="flex items-start gap-3 py-2.5">
            <span class="w-6 shrink-0 text-right text-meta tabular-nums text-fg-muted">{{ i + 1 }}</span>
            <span class="min-w-0 flex-1">
              <span class="block break-words text-body text-fg-strong">{{ s.subjectName }}</span>
              <span class="block text-meta text-fg-muted">{{ sessionTopicLabel(s) }} · {{ durationLabel(s.minutes) }}{{ s.pass === 2 ? ' · reforço' : '' }}</span>
            </span>
          </li>
        </ol>
      </UiSection>

      <div>
        <p class="text-meta font-semibold text-fg-strong">Baixar o cronograma</p>
        <div class="mt-2 flex flex-wrap gap-2">
          <UiButton variant="outline" size="sm" :icon-left="Printer" data-testid="edital-schedule-pdf" @click="gate('pdf', printPdf)">PDF</UiButton>
          <UiButton v-if="schedule.summary.calendar" variant="outline" size="sm" :icon-left="CalendarPlus" data-testid="edital-schedule-ics" @click="gate('ics', exportIcs)">Agenda (.ics)</UiButton>
          <UiButton variant="outline" size="sm" :icon-left="Download" data-testid="edital-schedule-csv" @click="exportCsv">Planilha</UiButton>
        </div>
        <p v-if="schedule.summary.calendar" class="mt-2 text-meta text-fg-muted">A agenda é uma foto do plano: baixe de novo quando mudar as horas.</p>
      </div>
    </div>

    <!-- The one lilac block: the invite (below the grid on the phone, fixed on the right from 1024 px) -->
    <aside class="public-schedule-invite" aria-label="Siga o cronograma no Baigi">
      <UiSection variant="tinted" class="flex flex-col gap-4" data-testid="edital-schedule-invite">
        <UiBaigiMascot state="idle" :size="56" />
        <h2 class="text-title font-semibold text-fg-strong">Siga o cronograma no Baigi e lembre do que estudou</h2>
        <dl class="grid grid-cols-2 gap-3 text-meta">
          <div>
            <dt class="font-semibold text-fg-strong">Só o PDF</dt>
            <dd class="mt-1 text-fg">A ordem no papel. Atrasou, refaça à mão.</dd>
          </div>
          <div>
            <dt class="font-semibold text-fg-strong">No Baigi (grátis)</dt>
            <dd class="mt-1 text-fg">O Hoje diz o que estudar, o plano se refaz sozinho e a revisão cuida da memória até a prova.</dd>
          </div>
        </dl>
        <UiButton variant="primary" block :loading="applying" data-testid="edital-schedule-signup" @click="emit('apply')">{{ loggedIn ? 'Estudar isso no Baigi' : 'Criar conta grátis' }}</UiButton>
        <AuthGoogleButton v-if="!loggedIn" :before-redirect="() => emit('google')" />
      </UiSection>
    </aside>

    <UiSheet v-model="sheetOpen" title="Ajustar dia a dia e o peso" size="lg">
      <ScheduleSettingsForm v-if="sheetDraft" v-model="sheetDraft" :subjects="formSubjects" :with-levels="false" />
      <template #footer>
        <div class="flex w-full flex-wrap justify-end gap-2">
          <UiButton variant="ghost" @click="sheetOpen = false">Cancelar</UiButton>
          <UiButton variant="primary" data-testid="edital-schedule-save" @click="applySheet">Usar estas horas</UiButton>
        </div>
      </template>
    </UiSheet>

    <SchedulePrint v-if="printer.printing.value" :schedule="schedule" :title="proposal.name" :subtitle="printSubtitle" :invite="inviteUrl" />
  </div>
</template>

<script setup lang="ts">
// Aba Cronograma of the free tool (prd-cronograma RF-W5; estudo §5.3): the same pure function as the caderno, over the
// reading. The exam date comes from the edital or is typed; hours, session and weights stay on this device; the
// assuntos marked "estudado" count as seen. Free: the screen, the link and the CSV. The PDF and the .ics go through
// the e-mail (`gate`, the dialog of the result). The invite is the one lilac block, with "Criar conta grátis".
import { CalendarPlus, Download, Printer } from 'lucide-vue-next'
import type { EditalProposal, EditalWeight } from '~/types'
import { studyDay } from '~/utils/greeting'
import { PDF_INVITE_PATH, loadPublicSchedule, publicDraft, publicFormSubjects, publicScheduleInput, savePublicSchedule, weightsLine, type PublicScheduleState } from '~/utils/publicSchedule'
import { downloadScheduleCsv, downloadScheduleIcs } from '~/utils/scheduleExport'
import { examLine } from '~/utils/publicEdital'
import { addDays, buildStudySchedule, dayMonth, durationLabel, hoursSummary, HOUR_OPTIONS, sessionTopicLabel, type ScheduleDraft } from '~/utils/studySchedule'

const props = defineProps<{
  readingId: string
  proposal: EditalProposal
  weights?: EditalWeight[] | null
  checked: ReadonlySet<string>
  loggedIn: boolean
  applying?: boolean
  /** The e-mail before the PDF and the .ics: runs `download` right away when it was given in this visit */
  gate: (tool: 'pdf' | 'ics', download: () => void) => void
}>()
const emit = defineEmits<{ (e: 'apply'): void, (e: 'google'): void }>()

const { track } = useAnalytics()
const printer = usePrintSchedule()
const today = studyDay()
const tomorrow = addDays(today, 1)
const SESSIONS = [{ value: 30, label: '30 min' }, { value: 60, label: '1 h' }, { value: 90, label: '1 h 30' }]

const state = ref<PublicScheduleState>(loadPublicSchedule(props.readingId))
watch(state, v => savePublicSchedule(props.readingId, v), { deep: true })

const editalDate = computed(() => props.proposal.exam_date)
const schedule = computed(() => buildStudySchedule(publicScheduleInput(props.proposal, props.weights, state.value, props.checked, today)))
const formSubjects = computed(() => publicFormSubjects(props.proposal, props.weights))
const weightsText = computed(() => (Object.keys(state.value.weights).length ? 'Peso: o seu, matéria por matéria.' : weightsLine(props.weights)))

function patch(p: Partial<PublicScheduleState>) {
  state.value = { ...state.value, ...p }
}
function setDay(wd: number, h: number) {
  const hours = [...state.value.hours]
  hours[wd] = h
  patch({ hours })
}
function setWeekdays(h: number) {
  const hours = [...state.value.hours]
  for (const wd of [1, 2, 3, 4, 5]) hours[wd] = h
  patch({ hours })
}

const summaryLine = computed(() => {
  const s = schedule.value.summary
  const parts = [`${s.sessions} ${s.sessions === 1 ? 'sessão' : 'sessões'}${s.calendar ? ' até a prova' : ''}`, `${s.seenPct}% dos assuntos vistos`]
  if (s.calendar && s.firstContactEnd && schedule.value.overflow?.kind !== 'late') parts.push(`1º contato até ${dayMonth(s.firstContactEnd)}`)
  return parts.join(' · ')
})

const overflowTitle = computed(() => {
  const o = schedule.value.overflow
  if (!o) return ''
  if (o.kind === 'tight') return `Está apertado: com mais ${o.missingHours} h sobra tempo para a segunda rodada.`
  return o.firstContactEnd
    ? `Não cabe: faltam ${o.missingHours} h. No ritmo dessas horas, o 1º contato termina em ${dayMonth(o.firstContactEnd)}.`
    : `Não cabe: faltam ${o.missingHours} h para ver todos os assuntos uma vez.`
})

/* ---- the sheet: day by day and the weight ---- */

const sheetOpen = ref(false)
const sheetDraft = ref<ScheduleDraft | null>(null)
function openSheet() {
  sheetDraft.value = publicDraft(state.value)
  sheetOpen.value = true
}
function applySheet() {
  const d = sheetDraft.value
  if (d) patch({ hours: d.hours, startTimes: d.startTimes, sessionMinutes: d.sessionMinutes, weights: d.weights })
  sheetOpen.value = false
}

/* ---- downloads ---- */

const inviteUrl = computed(() => (import.meta.client ? `${window.location.origin}${PDF_INVITE_PATH}` : PDF_INVITE_PATH))
const printSubtitle = computed(() => [examLine(props.proposal.exam_date ?? state.value.examDate), hoursSummary(state.value.hours), `sessão de ${durationLabel(state.value.sessionMinutes)}`].filter(Boolean).join(' · '))

function printPdf() {
  track('schedule_export', { format: 'pdf', origin: 'public' })
  // After the dialog's leave transition: the PDF shows only the cronograma
  setTimeout(() => { void printer.print() }, 250)
}

function exportIcs() {
  track('schedule_export', { format: 'ics', origin: 'public' })
  downloadScheduleIcs(schedule.value, { name: props.proposal.name, now: new Date(), url: `${window.location.origin}${PDF_INVITE_PATH}` })
}

function exportCsv() {
  track('schedule_export', { format: 'csv', origin: 'public' })
  downloadScheduleCsv(schedule.value, state.value.sessionMinutes, props.proposal.name)
}

function gate(tool: 'pdf' | 'ics', run: () => void) {
  props.gate(tool, run)
}
</script>

<style scoped>
@media (min-width: 64rem) {
  .public-schedule { grid-template-columns: minmax(0, 1fr) 17rem; align-items: start; }
  .public-schedule-invite { position: sticky; top: 1.5rem; }
}
</style>
