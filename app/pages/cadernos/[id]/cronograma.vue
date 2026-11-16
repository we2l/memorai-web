<template>
  <div class="mx-auto flex max-w-page flex-col gap-6 px-gutter pt-2 pb-6 md:pt-8" :aria-busy="loading ? 'true' : undefined">
    <template v-if="loading">
      <UiSkeleton variant="text" :lines="2" class="max-w-sm" />
      <UiSkeleton variant="block" size="lg" />
      <span class="sr-only" role="status">Carregando o cronograma…</span>
    </template>

    <LazyUiEmptyState v-else-if="problem === 'not-root'" title="O cronograma é do caderno inteiro" description="Abra o caderno e monte o cronograma por lá: ele cobre todas as matérias." mascot="subtle">
      <template #action><UiButton variant="primary" :to="cadernoPath(id)">Voltar</UiButton></template>
    </LazyUiEmptyState>
    <LazyUiEmptyState v-else-if="problem === 'not-found'" title="Caderno não encontrado" description="Se você o excluiu, ele fica na lixeira por 30 dias." mascot="subtle">
      <template #action><UiButton variant="primary" to="/cadernos">Ver cadernos</UiButton></template>
    </LazyUiEmptyState>
    <UiErrorState v-else-if="!res" title="Não foi possível carregar o cronograma" @retry="load" />

    <template v-else>
      <UiPageHeader title="Cronograma" :back="{ to: cadernoPath(id), label: res.topic.name }" :meta="headerMeta" />

      <!-- No matéria yet: the schedule walks the assuntos of each matéria -->
      <UiSection v-if="!res.subjects.length" data-testid="schedule-no-subjects">
        <p class="text-body text-fg-strong">Este caderno ainda não tem matérias.</p>
        <p class="mt-1 text-body text-fg-muted">Crie as matérias e os assuntos no caderno (ou monte pelo edital) e volte aqui.</p>
        <UiButton class="mt-4" variant="outline" :to="cadernoPath(id)">Abrir o caderno</UiButton>
      </UiSection>

      <!-- First time: the setup opens with the defaults, and the preview below follows each change -->
      <div v-else-if="!res.configured" class="flex max-w-prose flex-col gap-6" data-testid="schedule-setup">
        <UiSection>
          <h2 class="text-title font-semibold text-fg-strong">Monte o cronograma</h2>
          <p class="mt-1 text-body text-fg-muted">Diga quanto tempo você tem. O Baigi distribui os assuntos {{ res.exam ? 'até a prova' : 'numa fila' }}, com mais tempo para o que pesa mais.</p>
          <ScheduleSettingsForm v-model="draft" class="mt-5" :subjects="formSubjects" :review-minutes="reviewMinutes" />
        </UiSection>
        <p class="text-body text-fg" role="status" data-testid="schedule-preview">{{ previewText }}</p>
        <div class="flex flex-wrap items-center gap-3">
          <UiButton variant="primary" :loading="saving" data-testid="schedule-create" @click="save">Criar o cronograma</UiButton>
          <UiButton variant="ghost" :to="cadernoPath(id)">Agora não</UiButton>
        </div>
      </div>

      <UiSplit v-else side-label="Hoje no cronograma">
        <template #side>
          <ScheduleToday
            :sessions="todayList"
            :next="next"
            :today="today"
            :calendar="schedule!.summary.calendar"
            :done-today="schedule!.summary.doneToday"
            :subject-order="subjectOrder"
            :busy="marking.pending.value"
            @mark="onMark"
          />

          <UiSection aria-label="Andamento" class="flex flex-col gap-3" data-testid="schedule-summary">
            <p class="flex flex-wrap items-baseline gap-x-2">
              <UiNumber :value="`${summary!.seenPct}%`" size="m" />
              <span class="text-body text-fg-muted">dos assuntos vistos</span>
            </p>
            <UiProgressBar :value="summary!.seen" :max="Math.max(1, summary!.topics)" label="Assuntos vistos no primeiro contato" />
            <p class="text-body text-fg" data-testid="schedule-summary-line">{{ summaryLine }}</p>
            <p v-if="behindLine" class="text-meta text-fg-muted" data-testid="schedule-behind">{{ behindLine }}</p>
            <p v-if="reviewMinutes" class="text-meta text-fg-muted">Revisão dos cards: {{ reviewMinutes }} min por dia, à parte (a meta do Hoje).</p>
            <p v-if="!res.exam" class="text-meta text-fg-muted">
              Sem data de prova, o cronograma é uma fila.
              <button type="button" class="inline-block py-1 font-medium text-action-fg underline" data-testid="schedule-set-exam" @click="examOpen = true">Definir a prova</button>
            </p>
          </UiSection>

          <UiSection aria-label="Horas e downloads" class="flex flex-col gap-4">
            <div>
              <p class="text-body text-fg-strong">Horas: {{ hoursText }}</p>
              <p class="text-meta text-fg-muted">Sessão de {{ durationLabel(settings.sessionMinutes) }}</p>
              <UiButton class="mt-3" variant="outline" size="sm" data-testid="schedule-adjust" @click="openSheet">Ajustar horas e peso</UiButton>
            </div>
            <div>
              <p class="text-meta font-semibold text-fg-strong">Baixar</p>
              <div class="mt-2 flex flex-wrap gap-2">
                <UiButton variant="outline" size="sm" :icon-left="Printer" data-testid="schedule-pdf" @click="exportPdf">PDF</UiButton>
                <UiButton v-if="summary!.calendar" variant="outline" size="sm" :icon-left="CalendarPlus" data-testid="schedule-ics" @click="exportIcs">Agenda (.ics)</UiButton>
                <UiButton variant="outline" size="sm" :icon-left="Download" data-testid="schedule-csv" @click="exportCsv">Planilha</UiButton>
              </div>
              <p v-if="summary!.calendar" class="mt-2 text-meta text-fg-muted">A agenda é uma foto do plano: baixe de novo quando replanejar.</p>
            </div>
          </UiSection>
        </template>

        <UiSection v-if="overflow" variant="tile" data-testid="schedule-overflow">
          <p class="text-body font-semibold text-fg-strong">{{ overflowTitle }}</p>
          <p class="mt-1 text-body text-fg">{{ overflowText }}</p>
          <ul class="mt-3 flex flex-col gap-1 text-body text-fg">
            <li>Ponha mais horas na semana.</li>
            <li>Use sessões de 30 min, que cabem nos dias curtos.</li>
            <li>Junte dois assuntos curtos da mesma matéria no caderno.</li>
          </ul>
          <UiButton class="mt-3" variant="outline" size="sm" @click="openSheet">Ajustar horas</UiButton>
        </UiSection>

        <ScheduleWeek v-if="summary!.calendar" :schedule="schedule!" :today="today" interactive @mark="onMark" />
        <UiSection v-else title="Próximas sessões" data-testid="schedule-queue">
          <ol class="flex flex-col divide-y divide-hairline">
            <li v-for="(s, i) in schedule!.sessions.slice(0, 20)" :key="s.id" class="flex items-start gap-3 py-2.5">
              <span class="w-6 shrink-0 text-right text-meta tabular-nums text-fg-muted">{{ i + 1 }}</span>
              <UiSubjectMark :index="Math.max(0, subjectOrder.indexOf(s.subjectId))" class="mt-1.5" />
              <span class="min-w-0 flex-1">
                <span class="block break-words text-body text-fg-strong">{{ s.subjectName }}</span>
                <span class="block text-meta text-fg-muted">{{ sessionTopicLabel(s) }} · {{ durationLabel(s.minutes) }}{{ s.pass === 2 && !s.unit ? ' · reforço' : '' }}</span>
              </span>
            </li>
          </ol>
        </UiSection>

        <ScheduleSubjects :subjects="schedule!.bySubject" :calendar="summary!.calendar" />
        <p v-if="summary!.finalStart" class="text-meta text-fg-muted">Reta final de {{ dayMonth(summary!.finalStart) }} até a véspera da prova: revisão do atraso, simulados e as matérias que pesam mais.</p>
      </UiSplit>
    </template>

    <UiSheet v-model="sheetOpen" title="Ajustar horas e peso" size="lg">
      <ScheduleSettingsForm v-if="sheetDraft && res" v-model="sheetDraft" :subjects="formSubjects" :review-minutes="reviewMinutes" />
      <template #footer>
        <div class="flex w-full flex-col gap-3">
          <p class="text-meta text-fg" role="status">{{ sheetPreview }}</p>
          <div class="flex flex-wrap justify-end gap-2">
            <UiButton variant="ghost" @click="sheetOpen = false">Cancelar</UiButton>
            <UiButton variant="primary" :loading="saving" data-testid="schedule-save" @click="save">Salvar</UiButton>
          </div>
        </div>
      </template>
    </UiSheet>

    <SchedulePrint v-if="printer.printing.value && schedule && res" :schedule="schedule" :title="res.topic.name" :subtitle="printSubtitle" />
    <LazyExamDialog v-if="examLoaded" v-model="examOpen" :topic-ids="[id]" origin="scope" @saved="load" />
  </div>
</template>

<script setup lang="ts">
// Cronograma do caderno (prd-cronograma RF-W2; estudo §5.1, §5.2): a study cycle projected from today until the exam.
// HOJE is the one primary block ("Estudar agora" opens the matéria), Feito and Pular with "Desfazer"; the progress,
// the delay as a neutral line, the week by week, the matérias and the downloads (PDF by print, .ics, CSV). The first
// visit opens on the setup with the defaults. Everything is computed in the browser (utils/studySchedule); the API
// keeps the inputs and the progress.
import { CalendarPlus, Download, Printer } from 'lucide-vue-next'
import { getErrorStatus } from '~/utils/apiErrors'
import { studyDay } from '~/utils/greeting'
import { downloadScheduleCsv, downloadScheduleIcs } from '~/utils/scheduleExport'
import {
  buildStudySchedule, dayMonth, draftOf, durationLabel, editalPointsOf, hoursSummary, inputWithDraft, nextSession, saveBodyOf,
  scheduleInputFromResource, scheduleSettingsOf, sessionTopicLabel, todaySessions, withProgress,
  type ScheduleDraft, type StudySchedule, type StudyScheduleResource, type StudySession,
} from '~/utils/studySchedule'

const route = useRoute()
const api = useScheduleApi()
const marking = useScheduleMark()
const printer = usePrintSchedule()
const { track } = useAnalytics()
const { run } = useApiAction()

const id = computed(() => String(route.params.id))
const today = studyDay()

const res = ref<StudyScheduleResource | null>(null)
const loading = ref(true)
const problem = ref<'not-root' | 'not-found' | null>(null)
const draft = ref<ScheduleDraft>({ hours: [], startTimes: null, sessionMinutes: 60, weights: {}, levels: {} })

async function load() {
  loading.value = !res.value
  problem.value = null
  try {
    res.value = await api.get(id.value)
    draft.value = draftOf(res.value)
  } catch (e) {
    const status = getErrorStatus(e)
    if (status === 422) problem.value = 'not-root'
    else if (status === 404) problem.value = 'not-found'
    else reportApiError(e, { silent: true })
  } finally {
    loading.value = false
  }
}
watch(id, () => { res.value = null; void load() }, { immediate: true })

useHead(() => ({ title: res.value ? `Cronograma · ${res.value.topic.name} · Baigi` : 'Cronograma · Baigi' }))

const settings = computed(() => (res.value ? scheduleSettingsOf(res.value) : { hours: [], startTimes: null, sessionMinutes: 60 }))
const reviewMinutes = computed(() => scheduleInputFromResource(res.value ?? emptyRes(), today).reviewMinutes ?? 0)
const schedule = computed<StudySchedule | null>(() => (res.value?.configured && res.value.subjects.length ? buildStudySchedule(scheduleInputFromResource(res.value, today)) : null))
const summary = computed(() => schedule.value?.summary ?? null)
const overflow = computed(() => schedule.value?.overflow ?? null)
const todayList = computed(() => (schedule.value ? todaySessions(schedule.value, today) : []))
const next = computed(() => (schedule.value ? nextSession(schedule.value, today) : null))
const subjectOrder = computed(() => res.value?.subjects.map(s => s.id) ?? [])
const formSubjects = computed(() => (res.value?.subjects ?? []).map(s => ({ id: s.id, name: s.name, topics: Math.max(1, s.topics.length), editalPoints: editalPointsOf(res.value!, s.id) })))
const hoursText = computed(() => hoursSummary(settings.value.hours))

function emptyRes(): StudyScheduleResource {
  return { configured: false, topic: { id: '', name: '' }, hours_by_weekday: null, start_times: null, session_minutes: null, levels: null, weights: null, exam: null, subjects: [], progress: [], review: null, created_at: null, updated_at: null }
}

const headerMeta = computed(() => {
  const r = res.value
  if (!r) return undefined
  const days = r.exam ? summary.value?.daysLeft ?? Math.round((Date.parse(r.exam.date) - Date.parse(today)) / 86_400_000) : null
  const exam = r.exam && days !== null ? (days > 1 ? `Prova em ${days} dias` : days === 1 ? 'Prova amanhã' : days === 0 ? 'Prova hoje' : 'A prova já passou') : 'Sem data de prova'
  return r.configured ? `${exam} · ${hoursText.value}` : exam
})

/** "112 sessões · 1º contato até 10/02 · no prazo" */
function lineOf(s: StudySchedule): string {
  const parts = [`${s.summary.sessions} ${s.summary.sessions === 1 ? 'sessão' : 'sessões'}${s.summary.calendar ? ' até a prova' : ' na fila'}`]
  if (s.summary.calendar && s.summary.firstContactEnd) parts.push(`1º contato até ${dayMonth(s.summary.firstContactEnd)}${s.overflow?.kind === 'late' ? '' : ' · no prazo'}`)
  else if (s.summary.calendar && s.summary.seen === s.summary.topics && s.summary.topics) parts.push('1º contato completo')
  return parts.join(' · ')
}

const summaryLine = computed(() => (schedule.value ? lineOf(schedule.value) : ''))

const behindLine = computed(() => {
  const s = summary.value
  if (!s?.behind) return ''
  const end = s.firstContactEnd ? ` · 1º contato termina em ${dayMonth(s.firstContactEnd)}` : ''
  return `Você está ${s.behind} ${s.behind === 1 ? 'sessão' : 'sessões'} atrás${end}`
})

const overflowTitle = computed(() => {
  const o = overflow.value
  if (!o) return ''
  return o.kind === 'late' ? `Não cabe: faltam ${o.missingHours} h para ver todos os assuntos uma vez` : 'Está apertado: quase todo o tempo vai para o primeiro contato'
})
const overflowText = computed(() => {
  const o = overflow.value
  if (!o) return ''
  if (o.kind === 'tight') return `Sobra pouco para a segunda rodada, a dos assuntos fracos. Com mais ${o.missingHours} h ela cabe.`
  if (!o.firstContactEnd) return 'Sem horas na semana, nenhuma sessão entra no calendário.'
  return `No ritmo das suas horas, você termina o 1º contato em ${dayMonth(o.firstContactEnd)}, ${o.lateDays} ${o.lateDays === 1 ? 'dia' : 'dias'} depois do planejado.`
})

/* ---- first setup and the sheet ---- */

const saving = ref(false)
const sheetOpen = ref(false)
const sheetDraft = ref<ScheduleDraft | null>(null)

function previewOf(d: ScheduleDraft): string {
  if (!res.value) return ''
  const s = buildStudySchedule(inputWithDraft(res.value, d, today))
  if (s.overflow?.kind === 'late') return `Não cabe: faltam ${s.overflow.missingHours} h para ver todos os assuntos uma vez.`
  return `${lineOf(s)}.`
}
const previewText = computed(() => previewOf(draft.value))
const sheetPreview = computed(() => (sheetDraft.value ? previewOf(sheetDraft.value) : ''))

function openSheet() {
  if (!res.value) return
  sheetDraft.value = draftOf(res.value)
  sheetOpen.value = true
}

async function save() {
  const body = saveBodyOf(sheetOpen.value && sheetDraft.value ? sheetDraft.value : draft.value)
  const first = !res.value?.configured
  saving.value = true
  const saved = await run(() => api.save(id.value, body), {
    success: first ? 'Cronograma criado' : 'Cronograma atualizado',
    error: 'Não foi possível salvar o cronograma. Tente de novo.',
  })
  saving.value = false
  if (!saved) return
  res.value = saved
  draft.value = draftOf(saved)
  sheetOpen.value = false
}

/* ---- Feito / Pular ---- */

function onMark(session: StudySession, status: 'done' | 'skipped') {
  const r = res.value
  if (!r) return
  void marking.mark({ scheduleTopicId: r.topic.id, topicId: session.topicId, pass: session.pass, label: session.unit ? session.subjectName : session.topicName }, status, (next) => {
    if (res.value) res.value = { ...res.value, progress: withProgress(res.value.progress, session.topicId, session.pass, next, new Date().toISOString()) }
  })
}

/* ---- downloads ---- */

const printSubtitle = computed(() => [headerMeta.value, `sessão de ${durationLabel(settings.value.sessionMinutes)}`].filter(Boolean).join(' · '))

function exportPdf() {
  track('schedule_export', { format: 'pdf', origin: 'app' })
  void printer.print()
}

function exportIcs() {
  if (!schedule.value || !res.value) return
  track('schedule_export', { format: 'ics', origin: 'app' })
  downloadScheduleIcs(schedule.value, { name: res.value.topic.name, now: new Date(), url: `${window.location.origin}${cadernoPath(id.value, { view: 'cronograma' })}` })
}

function exportCsv() {
  if (!schedule.value || !res.value) return
  track('schedule_export', { format: 'csv', origin: 'app' })
  downloadScheduleCsv(schedule.value, settings.value.sessionMinutes, res.value.topic.name)
}

const examOpen = ref(false)
const examLoaded = useLoadedOnce(() => examOpen.value)
</script>
