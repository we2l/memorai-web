<template>
  <div class="p-4 sm:p-6 max-w-4xl mx-auto">
    <UiPageHeader title="Progresso" class="mb-6" />

    <!-- Provas on top (prd-navegacao-v3 RF-8): the next ones and the full agenda in /provas -->
    <UiSection id="provas" title="Provas" class="mb-6" data-testid="progress-exams">
      <template #action>
        <UiLink to="/provas" standalone>Ver agenda</UiLink>
      </template>
      <!-- An error is never an empty state (RN-UX-03): the agenda says it did not load -->
      <div v-if="examsError" role="alert" class="flex flex-wrap items-center justify-between gap-3">
        <p class="text-meta text-fg-muted">Não foi possível carregar suas provas.</p>
        <UiButton size="sm" :icon-left="RotateCw" @click="loadExams">Tentar de novo</UiButton>
      </div>
      <UiSkeleton v-else-if="examsLoading" variant="row" />
      <ul v-else-if="nextExams.length" class="-mx-3 -mb-2 divide-y divide-line">
        <li v-for="exam in nextExams" :key="exam.id">
          <UiListRow to="/provas" :title="exam.title" :meta="examMeta(exam)">
            <template #trailing>
              <span class="font-semibold tabular-nums text-fg-strong">{{ exam.days_remaining === 1 ? 'amanhã' : `em ${exam.days_remaining} dias` }}</span>
            </template>
          </UiListRow>
        </li>
      </ul>
      <div v-else class="flex flex-wrap items-center justify-between gap-3">
        <p class="text-meta text-fg-muted">Nenhuma prova agendada. Com a data, o Baigi prioriza o que revisar até lá.</p>
        <UiButton size="sm" to="/provas?nova=1">Agendar prova</UiButton>
      </div>
    </UiSection>

    <!-- Loading -->
    <div v-if="loading" class="space-y-6" aria-busy="true">
      <UiSkeleton variant="block" />
      <UiSkeleton variant="block" size="lg" />
      <UiSkeleton variant="block" />
    </div>

    <UiErrorState
      v-else-if="loadError"
      variant="page"
      title="Não foi possível carregar seu progresso"
      description="Verifique sua conexão e tente de novo."
      @retry="load"
    />

    <template v-else-if="data">
      <!-- Mastery hero -->
      <div class="card py-6 px-6 mb-6 text-center">
        <p class="text-meta text-fg-muted mb-1">Domínio geral</p>
        <p class="text-4xl font-bold text-fg-strong">{{ data.mastery_pct }}%</p>
        <p class="text-label text-fg-muted mt-2">dos seus cards estão dominados</p>
        <!-- Card states bar -->
        <div class="flex h-3 rounded-full overflow-hidden mt-4 bg-line">
          <div
            v-if="data.card_states.mature"
            class="bg-success transition-all"
            :style="{ width: pct(data.card_states.mature) }"
          />
          <div
            v-if="data.card_states.learning"
            class="bg-warning transition-all"
            :style="{ width: pct(data.card_states.learning) }"
          />
          <div
            v-if="data.card_states.new"
            class="bg-fg-muted transition-all"
            :style="{ width: pct(data.card_states.new) }"
          />
        </div>
        <div class="flex justify-center gap-4 mt-3 text-label text-fg-muted">
          <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-success inline-block" /> Dominados ({{ data.card_states.mature }})</span>
          <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-warning inline-block" /> Aprendendo ({{ data.card_states.learning }})</span>
          <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-fg-muted inline-block" /> Novos ({{ data.card_states.new }})</span>
        </div>
      </div>

      <!-- Retention + dias seguidos row -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div class="card py-5 px-5 text-center">
          <p class="text-meta text-fg-muted mb-1">Retenção (7 dias)</p>
          <p class="text-section font-bold" :class="retentionColor(data.retention_7d)">
            {{ data.retention_7d != null ? data.retention_7d + '%' : '—' }}
          </p>
        </div>
        <div class="card py-5 px-5 text-center">
          <p class="text-meta text-fg-muted mb-1">Retenção (30 dias)</p>
          <p class="text-section font-bold" :class="retentionColor(data.retention_30d)">
            {{ data.retention_30d != null ? data.retention_30d + '%' : '—' }}
          </p>
        </div>
        <div class="card py-5 px-5 text-center">
          <p class="text-meta text-fg-muted mb-1">Dias seguidos</p>
          <p class="text-section font-bold text-fg-strong">{{ data.streak }} 🔥</p>
        </div>
      </div>

      <!-- Heatmap -->
      <div class="card py-5 px-5 mb-6">
        <h2 class="text-section mb-4">Consistência (últimos 90 dias)</h2>
        <div class="flex flex-wrap gap-[3px]">
          <div
            v-for="day in heatmapDays"
            :key="day.date"
            class="w-3 h-3 rounded-sm transition-colors"
            :class="heatmapColor(day.count)"
            :title="`${day.date}: ${day.count} revisões`"
          />
        </div>
        <div class="flex items-center gap-2 mt-3 text-label text-fg-muted">
          <span>Menos</span>
          <span class="w-3 h-3 rounded-sm bg-line" />
          <span class="w-3 h-3 rounded-sm bg-success/20" />
          <span class="w-3 h-3 rounded-sm bg-success/50" />
          <span class="w-3 h-3 rounded-sm bg-success/80" />
          <span class="w-3 h-3 rounded-sm bg-success" />
          <span>Mais</span>
        </div>
      </div>

      <!-- Weak topics -->
      <div v-if="data.weak_topics.length" class="card py-5 px-5">
        <h2 class="text-section mb-4">Cadernos mais fracos</h2>
        <div class="space-y-3">
          <div v-for="topic in data.weak_topics" :key="topic.id" class="flex items-center gap-3">
            <div class="flex-1 min-w-0">
              <p class="text-meta text-fg-strong truncate">{{ topic.name }}</p>
              <div class="flex items-center gap-2 mt-1">
                <div class="flex-1 h-2 rounded-full bg-line">
                  <div
                    class="h-2 rounded-full bg-danger transition-all"
                    :style="{ width: topic.mastery_pct + '%' }"
                  />
                </div>
                <span class="text-label text-fg-muted">{{ topic.mastery_pct }}%</span>
              </div>
            </div>
            <UiButton variant="secondary" size="sm" :to="cadernoPath(topic.id)"
              class="text-label shrink-0">
              Ver caderno
            </UiButton>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="!data.streak && data.mastery_pct === 0" class="card text-center py-10 mt-6">
        <p class="text-fg">Revise seus primeiros cards pra ver seu progresso aqui.</p>
        <UiButton variant="primary" to="/revisar" class="mt-4 inline-flex">Começar revisão</UiButton>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { RotateCw } from 'lucide-vue-next'
import type { ExamUpcoming } from '~/types'

const { $api } = useNuxtApp()
const examStore = useExamStore()

// /exams/upcoming straight (the store's fetchUpcoming swallows the error: here an error is not "no exam")
const examsLoading = ref(true)
const examsError = ref(false)
async function loadExams() {
  examsLoading.value = true
  examsError.value = false
  try {
    examStore.upcoming = (await $api<{ data: ExamUpcoming[] }>('/exams/upcoming')).data
  } catch (e) {
    examsError.value = true
    reportApiError(e, { silent: true })
  } finally {
    examsLoading.value = false
  }
}
const nextExams = computed(() => examStore.upcoming.filter(e => e.days_remaining >= 0).slice(0, 3))
function examMeta(exam: ExamUpcoming) {
  const date = new Date(exam.exam_date.slice(0, 10) + 'T00:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
  return exam.cards_per_day ? `${date} · ${exam.cards_per_day} cards por dia` : date
}

interface ProgressData {
  mastery_pct: number
  card_states: { new: number; learning: number; mature: number }
  retention_7d: number | null
  retention_30d: number | null
  streak: number
  heatmap: Record<string, number>
  weak_topics: { id: string; name: string; total_cards: number; mastery_pct: number }[]
}

const data = ref<ProgressData | null>(null)
const loading = ref(true)

const totalCards = computed(() => {
  if (!data.value) return 1
  const s = data.value.card_states
  return s.new + s.learning + s.mature || 1
})

function pct(count: number) {
  return Math.round((count / totalCards.value) * 100) + '%'
}

function retentionColor(val: number | null) {
  if (val == null) return 'text-base-muted'
  if (val >= 80) return 'text-[var(--state-success)]'
  if (val >= 60) return 'text-[var(--state-warning)]'
  return 'text-[var(--state-danger)]'
}

const heatmapDays = computed(() => {
  const days: { date: string; count: number }[] = []
  for (let i = 89; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    days.push({ date: dateStr, count: data.value?.heatmap[dateStr] ?? 0 })
  }
  return days
})

function heatmapColor(count: number) {
  if (count === 0) return 'bg-[var(--line)]'
  if (count <= 5) return 'bg-success/20'
  if (count <= 15) return 'bg-success/50'
  if (count <= 30) return 'bg-success/80'
  return 'bg-success'
}

const loadError = ref(false)

async function load() {
  loading.value = true
  loadError.value = false
  if (examsError.value) void loadExams()
  try {
    const res = await $api<any>('/stats/progress')
    data.value = res.data
  } catch (e) {
    loadError.value = true
    reportApiError(e, { silent: true })
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void load()
  void loadExams()
})
</script>
