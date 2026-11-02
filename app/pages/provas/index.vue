<script setup lang="ts">
import { ChevronLeft, ChevronRight, Plus, Trash2, Eye } from 'lucide-vue-next'
import type { Exam, ExamOutcome } from '~/types'

const examStore = useExamStore()
const toast = useToast()
const route = useRoute()
const router = useRouter()
const { $api } = useNuxtApp()

const showCreateModal = ref(false)
const showDeleteModal = ref(false)
const examToDelete = ref<string | null>(null)
const activeTab = ref<'upcoming' | 'past'>('upcoming')
const currentMonth = ref(new Date())
const selectedDay = ref<null | { day: number; date: string; exams: any[]; totalCards: number; isCurrentMonth: boolean }>(null)

// "Cadastrar nova prova" from the result page: /provas?nova=1&from={examId} (RF-F11)
const createTopicIds = ref<string[]>([])

async function openFromQuery() {
  if (route.query.nova !== '1') return
  const from = typeof route.query.from === 'string' ? route.query.from : ''
  if (from) {
    const known = examStore.exams.find(e => e.id === from)
    try {
      const exam = known ?? (await $api<{ data: Exam }>(`/exams/${from}`)).data
      createTopicIds.value = exam.topics.map(t => t.id)
    } catch (e) {
      reportApiError(e, { silent: true })
    }
  }
  showCreateModal.value = true
  router.replace({ query: {} })
}

onMounted(async () => {
  await Promise.all([examStore.fetchExams(), examStore.fetchUpcoming(), fetchCalendar()])
  await openFromQuery()
})

// "Como foi?" on past exams (RF-F10)
const { run: runOutcome, pending: savingOutcome } = useApiAction()
function answerOutcome(id: string, outcome: ExamOutcome) {
  return runOutcome(() => examStore.recordOutcome(id, outcome), {
    success: outcome === 'passed' ? 'Parabéns pela aprovação!' : 'Resposta registrada. Bora para a próxima.',
    error: 'Não foi possível salvar sua resposta.',
  })
}

function closeCreate() {
  showCreateModal.value = false
  createTopicIds.value = []
}

async function fetchCalendar() {
  const start = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth(), 1)
  const end = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() + 2, 0)
  await examStore.fetchCalendar(start.toISOString().slice(0, 10), end.toISOString().slice(0, 10))
}

function prevMonth() { currentMonth.value = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() - 1, 1); selectedDay.value = null; fetchCalendar() }
function nextMonth() { currentMonth.value = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() + 1, 1); selectedDay.value = null; fetchCalendar() }
function goToday() { currentMonth.value = new Date(); selectedDay.value = null; fetchCalendar() }

function selectDay(cell: any) {
  if (!cell || !cell.isCurrentMonth) return
  selectedDay.value = selectedDay.value?.date === cell.date ? null : cell
}

async function handleCreated() { closeCreate(); await examStore.fetchExams(); await fetchCalendar(); toast.show('Prova criada!', 'success') }

function confirmDelete(id: string) {
  examToDelete.value = id
  showDeleteModal.value = true
}

async function handleDelete() {
  if (!examToDelete.value) return
  await examStore.deleteExam(examToDelete.value)
  await fetchCalendar()
  showDeleteModal.value = false
  examToDelete.value = null
  toast.show('Prova removida', 'success')
}

function viewExamDetails(exam: any) {
  // exam_date may come as "2026-07-25" or "2026-07-25T00:00:00.000Z"
  const dateStr = exam.exam_date.slice(0, 10)
  const examDate = new Date(dateStr + 'T12:00:00')

  // Navigate to exam month if needed
  if (examDate.getMonth() !== currentMonth.value.getMonth() || examDate.getFullYear() !== currentMonth.value.getFullYear()) {
    currentMonth.value = new Date(examDate.getFullYear(), examDate.getMonth(), 1)
    fetchCalendar().then(() => {
      nextTick(() => {
        selectedDay.value = calendarDays.value.find(c => c.date === dateStr) || null
        window.scrollTo({ top: 0, behavior: 'smooth' })
      })
    })
  } else {
    selectedDay.value = calendarDays.value.find(c => c.date === dateStr) || null
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

function formatDate(date: string) { return new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) }

const filteredExams = computed(() => activeTab.value === 'upcoming' ? examStore.futureExams : examStore.pastExams)

const monthLabel = computed(() => {
  const m = currentMonth.value.toLocaleDateString('pt-BR', { month: 'long' })
  return `${m.charAt(0).toUpperCase() + m.slice(1)} ${currentMonth.value.getFullYear()}`
})

const calendarDays = computed(() => {
  const year = currentMonth.value.getFullYear()
  const month = currentMonth.value.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const prevMonthDays = new Date(year, month, 0).getDate()
  const today = new Date().toISOString().slice(0, 10)
  const firstWeekday = new Date(year, month, 1).getDay()
  const startPad = firstWeekday === 0 ? 6 : firstWeekday - 1

  const days: any[] = []

  for (let i = startPad - 1; i >= 0; i--) {
    const d = prevMonthDays - i
    const prevM = month === 0 ? 11 : month - 1
    const prevY = month === 0 ? year - 1 : year
    const dateStr = `${prevY}-${String(prevM + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    days.push({ day: d, date: dateStr, isToday: false, isCurrentMonth: false, exams: [], totalCards: 0 })
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const calData = examStore.calendarData.find((c) => c.date === dateStr)
    days.push({ day: d, date: dateStr, isToday: dateStr === today, isCurrentMonth: true, exams: calData?.exams || [], totalCards: calData?.total_cards || 0 })
  }

  const remaining = 35 - days.length > 0 ? 35 - days.length : 42 - days.length
  for (let d = 1; d <= remaining; d++) {
    const nextM = month === 11 ? 0 : month + 1
    const nextY = month === 11 ? year + 1 : year
    const dateStr = `${nextY}-${String(nextM + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    days.push({ day: d, date: dateStr, isToday: false, isCurrentMonth: false, exams: [], totalCards: 0 })
  }

  return days
})
</script>

<template>
  <div class="max-w-[1100px] mx-auto px-4 py-6 space-y-8">
    <!-- The agenda belongs to Progresso (prd-navegacao-v3 RF-8); the full move is the Fase 4f -->
    <UiPageHeader title="Provas" meta="Sua agenda de provas e a carga de estudo até cada uma" :back="{ to: '/progresso', label: 'Progresso' }">
      <template #actions>
        <UiButton variant="primary" :icon-left="Plus" @click="showCreateModal = true">Nova prova</UiButton>
      </template>
    </UiPageHeader>

    <!-- Calendar Card -->
    <section class="rounded-[24px] border border-[var(--border-base)] overflow-hidden" style="background: var(--bg-card); box-shadow: var(--elev-card)">
      <!-- Header -->
      <div class="p-6 flex justify-between items-center" style="border-bottom: 1px solid var(--border-base)">
        <div class="flex items-center gap-5">
          <h2 class="text-section font-bold" style="color: var(--fg-strong)">{{ monthLabel }}</h2>
          <div class="flex gap-1">
            <button class="p-2 rounded-control transition-colors" style="color: var(--fg-muted)" aria-label="Mês anterior" @click="prevMonth">
              <ChevronLeft class="w-5 h-5" aria-hidden="true" />
            </button>
            <button class="p-2 rounded-control transition-colors" style="color: var(--fg-muted)" aria-label="Próximo mês" @click="nextMonth">
              <ChevronRight class="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
          <button class="px-4 py-1.5 rounded-control font-semibold text-meta transition-colors" style="border: 1px solid var(--border-base); color: var(--action-fg)" @click="goToday">Hoje</button>
        </div>
      </div>

      <!-- Calendar Grid -->
      <div class="grid grid-cols-7 gap-px" style="background-color: var(--border-base)">
        <!-- Weekday headers -->
        <div v-for="d in ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM']" :key="d" class="py-3 text-center text-[10px] font-bold uppercase tracking-widest" style="background: var(--surface-page); color: var(--fg-muted)">
          {{ d }}
        </div>
        <!-- Days -->
        <button
          v-for="(cell, idx) in calendarDays"
          :key="idx"
          type="button"
          class="min-h-[110px] p-4 text-left align-top text-meta transition-colors"
          :class="[
            cell.isCurrentMonth ? '' : 'text-fg-muted',
            selectedDay?.date === cell.date ? '!bg-action-subtle' : '',
          ]"
          :style="{ backgroundColor: cell.isCurrentMonth ? 'var(--bg-card)' : 'var(--surface-subtle)' }"
          @click="selectDay(cell)"
        >
          <span
            v-if="cell.isToday"
            class="inline-flex items-center justify-center w-8 h-8 rounded-full font-semibold text-meta"
            style="background: var(--action); color: var(--on-action)"
          >{{ cell.day }}</span>
          <span v-else :style="{ color: cell.isCurrentMonth ? 'var(--fg-strong)' : 'var(--fg-muted)' }">{{ cell.day }}</span>

          <!-- Exam chip / study indicator (like Google Calendar) -->
          <div v-if="cell.isCurrentMonth && (cell.exams.length || cell.totalCards > 0)" class="mt-1.5 space-y-0.5">
            <!-- Exam day: show exam name chip -->
            <div
              v-for="exam in cell.exams.filter(e => e.is_exam_day).slice(0, 2)"
              :key="exam.exam_id"
              class="text-[10px] leading-tight px-2 py-1 rounded-control font-bold truncate"
              style="background: var(--action-subtle); color: var(--action-fg); border: 1px solid var(--border-base)"
            >
              {{ exam.title }}
            </div>
            <!-- Study day: show cards to review -->
            <div
              v-if="cell.totalCards > 0 && !cell.exams.some(e => e.is_exam_day)"
              class="text-[9px] leading-tight px-1.5 py-0.5 rounded font-medium"
              style="background: var(--state-info-bg); color: var(--state-info)"
            >
              {{ cell.totalCards }} cards
            </div>
          </div>
        </button>
      </div>

      <!-- Day Panel -->
      <div v-if="selectedDay && (selectedDay.exams.length > 0 || selectedDay.totalCards > 0)" class="p-8" style="background: var(--surface-subtle)">
        <h3 class="text-[10px] font-bold uppercase tracking-[0.1em] mb-4" style="color: var(--fg-muted)">
          {{ new Date(selectedDay.date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }) }}
        </h3>
        <div v-for="exam in selectedDay.exams" :key="exam.exam_id" class="rounded-2xl p-5 flex justify-between items-center" style="background: var(--bg-card); border: 1px solid var(--border-base)">
          <div class="flex items-center gap-4">
            <div class="w-2.5 h-2.5 rounded-full" style="background: var(--action-fg)"></div>
            <span class="font-bold" style="color: var(--fg-strong)">{{ exam.title }}</span>
            <span v-if="exam.is_exam_day" class="px-3 py-1 rounded-full text-[10px] font-bold" style="background: var(--action-subtle); color: var(--action-fg)">PROVA</span>
          </div>
          <div class="text-meta" style="color: var(--fg-muted)">
            Carga estimada: <span class="font-bold" style="color: var(--fg-strong)">{{ exam.estimated_cards || selectedDay.totalCards }} cards</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Minhas Provas -->
    <section class="space-y-5">
      <div class="flex justify-between items-center">
        <h2 class="text-section font-bold" style="color: var(--fg-strong)">Minhas provas</h2>
        <div class="p-1 rounded-xl flex gap-1" style="background: var(--surface-subtle)">
          <button
            class="px-5 py-2 rounded-control font-semibold text-meta transition-colors"
            :style="activeTab === 'upcoming' ? 'background: var(--bg-card); color: var(--action-fg); box-shadow: var(--elev-card)' : 'color: var(--fg-muted)'"
            @click="activeTab = 'upcoming'"
          >Próximas</button>
          <button
            class="px-5 py-2 rounded-control font-semibold text-meta transition-colors"
            :style="activeTab === 'past' ? 'background: var(--bg-card); color: var(--action-fg); box-shadow: var(--elev-card)' : 'color: var(--fg-muted)'"
            @click="activeTab = 'past'"
          >Passadas</button>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="examStore.loading" class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div v-for="i in 2" :key="i" class="h-40 rounded-[24px] animate-pulse" style="background: var(--surface-subtle)" />
      </div>

      <!-- Empty -->
      <div v-else-if="filteredExams.length === 0" class="rounded-[24px] p-10 text-center" style="background: var(--bg-card); border: 1px solid var(--border-base); box-shadow: var(--elev-card)">
        <div class="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style="background: var(--action-subtle)">
          <svg class="w-7 h-7" style="color: var(--action-fg)" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" /></svg>
        </div>
        <h3 class="font-bold text-body mb-1" style="color: var(--fg-strong)">Nenhuma prova agendada</h3>
        <p class="text-meta mb-5" style="color: var(--fg-muted)">Agende suas provas e o algoritmo prioriza o que estudar primeiro.</p>
        <!-- Secondary: the screen's primary is "Nova prova" in the header (one per screen, ADR-027 §6) -->
        <UiButton :icon-left="Plus" @click="showCreateModal = true">Agendar primeira prova</UiButton>
      </div>

      <!-- Cards Grid -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div
          v-for="exam in filteredExams"
          :key="exam.id"
          class="rounded-[24px] p-6 relative group transition-all"
          style="background: var(--bg-card); border: 1px solid var(--border-base); box-shadow: var(--elev-card)"
        >
          <div class="flex justify-between items-start mb-3">
            <h3 class="font-bold text-body pr-2" style="color: var(--fg-strong)">{{ exam.title }}</h3>
            <div class="flex items-center gap-2 shrink-0">
              <span
                class="px-3 py-1 rounded-full text-[10px] font-bold uppercase"
                :style="{
                  background: exam.urgency_color === 'red' ? 'var(--state-danger-bg)' : exam.urgency_color === 'yellow' ? 'var(--state-warning-bg)' : 'var(--state-success-bg)',
                  color: exam.urgency_color === 'red' ? 'var(--state-danger)' : exam.urgency_color === 'yellow' ? 'var(--state-warning)' : 'var(--state-success)',
                }"
              >{{ exam.days_remaining }} dias</span>
              <button
                class="p-1.5 rounded-control opacity-0 group-hover:opacity-100 transition-opacity hover:bg-danger/10"
                style="color: var(--fg-muted)"
                title="Excluir prova"
                @click="confirmDelete(exam.id)"
               aria-label="Excluir prova">
                <Trash2 class="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          <p class="text-meta mb-3" style="color: var(--fg)">Cadernos: {{ exam.topics?.map(t => t.name).join(', ') || '—' }}</p>

          <!-- Status badges -->
          <div class="flex flex-wrap gap-1.5 mb-4">
            <UiTooltip v-if="exam.days_remaining <= 14" text="Cards deste caderno estão sendo priorizados na revisão">
              <span class="px-2 py-0.5 rounded-full text-[10px] font-medium bg-success/10 text-success border border-success/20">Boost ativo</span>
            </UiTooltip>
            <UiTooltip v-if="exam.reta_final_active" text="Modo intensivo: +20 cards extras pra consolidar antes da prova">
              <span class="px-2 py-0.5 rounded-full text-[10px] font-medium bg-danger/10 text-danger border border-danger/20">Reta Final</span>
            </UiTooltip>
            <UiTooltip v-if="exam.days_remaining > 14" text="Boost ativa quando faltar 14 dias ou menos">
              <span class="px-2 py-0.5 rounded-full text-[10px] font-medium bg-subtle text-fg-muted border border-line-strong">Preparando</span>
            </UiTooltip>
          </div>

          <!-- "Passou?" in the app (RF-F10) -->
          <div v-if="activeTab === 'past'" class="mb-4" data-testid="exam-outcome">
            <span
              v-if="exam.outcome"
              class="inline-flex px-3 py-1 rounded-full text-meta font-semibold"
              :class="exam.outcome === 'passed' ? 'bg-success-subtle text-success' : 'bg-subtle text-fg'"
            >{{ exam.outcome === 'passed' ? 'Aprovado 🎉' : 'Próxima vez' }}</span>
            <div v-else class="flex flex-wrap items-center gap-2">
              <span class="text-meta text-fg">Como foi?</span>
              <UiButton variant="secondary" type="button" class="!py-1.5 !min-h-touch text-meta" :disabled="savingOutcome" @click="answerOutcome(exam.id, 'passed')">Passei</UiButton>
              <UiButton variant="secondary" type="button" class="!py-1.5 !min-h-touch text-meta" :disabled="savingOutcome" @click="answerOutcome(exam.id, 'failed')">Não dessa vez</UiButton>
            </div>
          </div>

          <button class="flex items-center gap-2 text-meta font-bold cursor-pointer hover:opacity-80 transition-opacity" style="color: var(--action-fg)" @click="viewExamDetails(exam)">
            <Eye class="w-4 h-4" /> Ver detalhes
          </button>
        </div>
      </div>
    </section>

    <ExamCreateModal v-if="showCreateModal" :initial-topic-ids="createTopicIds" @close="closeCreate" @created="handleCreated" />

    <!-- Delete confirmation modal -->
    <UiConfirmModal
      v-model="showDeleteModal"
      title="Excluir prova"
      message="Tem certeza que deseja excluir esta prova? A priorização dos cadernos vinculados será removida."
      confirm-label="Excluir"
      variant="danger"
      @confirm="handleDelete"
    />
  </div>
</template>
