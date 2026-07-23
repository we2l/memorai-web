<script setup lang="ts">
import { ChevronLeft, ChevronRight, Plus, X, Eye } from 'lucide-vue-next'

const examStore = useExamStore()
const toast = useToast()

const showCreateModal = ref(false)
const activeTab = ref<'upcoming' | 'past'>('upcoming')
const currentMonth = ref(new Date())
const selectedDay = ref<null | { day: number; date: string; exams: any[]; totalCards: number; isCurrentMonth: boolean }>(null)

onMounted(async () => {
  await Promise.all([examStore.fetchExams(), examStore.fetchUpcoming(), fetchCalendar()])
})

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

async function handleCreated() { showCreateModal.value = false; await examStore.fetchExams(); await fetchCalendar(); toast.show('Prova criada!', 'success') }
async function handleDelete(id: string) { if (!confirm('Excluir esta prova?')) return; await examStore.deleteExam(id); await fetchCalendar(); toast.show('Prova removida', 'success') }

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
  <div class="max-w-[1100px] mx-auto px-4 py-6 pb-20 lg:pb-6 space-y-8">
    <!-- Calendar Card -->
    <section class="rounded-[24px] border border-[var(--border-base)] overflow-hidden" style="background: var(--bg-card); box-shadow: 0 8px 24px rgba(45, 35, 66, 0.08)">
      <!-- Header -->
      <div class="p-6 flex justify-between items-center" style="border-bottom: 1px solid var(--border-base)">
        <div class="flex items-center gap-5">
          <h2 class="text-xl font-bold" style="color: #1F2343">{{ monthLabel }}</h2>
          <div class="flex gap-1">
            <button class="p-2 rounded-lg transition-colors" style="color: var(--text-muted)" @click="prevMonth">
              <ChevronLeft class="w-5 h-5" />
            </button>
            <button class="p-2 rounded-lg transition-colors" style="color: var(--text-muted)" @click="nextMonth">
              <ChevronRight class="w-5 h-5" />
            </button>
          </div>
          <button class="px-4 py-1.5 rounded-lg font-semibold text-sm transition-colors" style="border: 1px solid #D7DDF2; color: #6F3FF5" @click="goToday">Hoje</button>
        </div>
        <button class="flex items-center gap-2 px-5 py-2.5 rounded-[14px] font-semibold text-sm text-white transition-all" style="background: #6F3FF5; box-shadow: 0 4px 12px rgba(111,63,245,0.25)" @click="showCreateModal = true">
          <Plus class="w-4 h-4" /> Nova prova
        </button>
      </div>

      <!-- Calendar Grid -->
      <div class="grid grid-cols-7 gap-px" style="background-color: #E7EAF3">
        <!-- Weekday headers -->
        <div v-for="d in ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM']" :key="d" class="py-3 text-center text-[10px] font-bold uppercase tracking-widest" style="background: var(--bg-base); color: #7a7487">
          {{ d }}
        </div>
        <!-- Days -->
        <button
          v-for="(cell, idx) in calendarDays"
          :key="idx"
          type="button"
          class="min-h-[110px] p-4 text-left align-top text-sm transition-colors"
          :class="[
            cell.isCurrentMonth ? '' : 'opacity-30',
            selectedDay?.date === cell.date ? '!bg-[#F5F2FF]' : '',
          ]"
          :style="{ backgroundColor: cell.isCurrentMonth ? 'var(--bg-card)' : '#F5F6FA' }"
          @click="selectDay(cell)"
        >
          <span
            v-if="cell.isToday"
            class="inline-flex items-center justify-center w-8 h-8 rounded-full text-white font-semibold text-sm"
            style="background: #6F3FF5"
          >{{ cell.day }}</span>
          <span v-else style="color: #101a37">{{ cell.day }}</span>

          <!-- Exam chip -->
          <div v-if="cell.exams.length && cell.isCurrentMonth" class="mt-2">
            <div
              v-for="exam in cell.exams.filter(e => e.is_exam_day).slice(0, 2)"
              :key="exam.exam_id"
              class="text-[10px] leading-tight px-2 py-1.5 rounded-lg font-bold truncate"
              style="background: #F5F2FF; color: #6F3FF5; border: 1px solid #D7DDF2"
            >
              {{ exam.title }}
            </div>
          </div>
        </button>
      </div>

      <!-- Day Panel -->
      <div v-if="selectedDay && (selectedDay.exams.length > 0 || selectedDay.totalCards > 0)" class="p-8" style="background: var(--bg-soft)">
        <h3 class="text-[10px] font-bold uppercase tracking-[0.1em] mb-4" style="color: #7a7487">
          {{ new Date(selectedDay.date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }) }}
        </h3>
        <div v-for="exam in selectedDay.exams" :key="exam.exam_id" class="rounded-2xl p-5 flex justify-between items-center" style="background: var(--bg-card); border: 1px solid #E7EAF3">
          <div class="flex items-center gap-4">
            <div class="w-2.5 h-2.5 rounded-full" style="background: #6F3FF5"></div>
            <span class="font-bold" style="color: #1F2343">{{ exam.title }}</span>
            <span v-if="exam.is_exam_day" class="px-3 py-1 rounded-full text-[10px] font-bold" style="background: #F5F2FF; color: #6F3FF5">PROVA</span>
          </div>
          <div class="text-sm" style="color: #7a7487">
            Carga estimada: <span class="font-bold" style="color: #1F2343">{{ exam.estimated_cards || selectedDay.totalCards }} cards</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Minhas Provas -->
    <section class="space-y-5">
      <div class="flex justify-between items-center">
        <h2 class="text-2xl font-bold" style="color: #1F2343">Minhas provas</h2>
        <div class="p-1 rounded-xl flex gap-1" style="background: #ebedff">
          <button
            class="px-5 py-2 rounded-lg font-semibold text-sm transition-colors"
            :style="activeTab === 'upcoming' ? 'background: white; color: #6F3FF5; box-shadow: 0 1px 3px rgba(0,0,0,0.08)' : 'color: #7a7487'"
            @click="activeTab = 'upcoming'"
          >Próximas</button>
          <button
            class="px-5 py-2 rounded-lg font-semibold text-sm transition-colors"
            :style="activeTab === 'past' ? 'background: white; color: #6F3FF5; box-shadow: 0 1px 3px rgba(0,0,0,0.08)' : 'color: #7a7487'"
            @click="activeTab = 'past'"
          >Passadas</button>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="examStore.loading" class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div v-for="i in 2" :key="i" class="h-40 rounded-[24px] animate-pulse" style="background: #F5F6FA" />
      </div>

      <!-- Empty -->
      <div v-else-if="filteredExams.length === 0" class="rounded-[24px] p-10 text-center" style="background: var(--bg-card); border: 1px solid #E7EAF3; box-shadow: 0 8px 24px rgba(45, 35, 66, 0.08)">
        <div class="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style="background: #F5F2FF">
          <svg class="w-7 h-7" style="color: #6F3FF5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" /></svg>
        </div>
        <h3 class="font-bold text-lg mb-1" style="color: #1F2343">Nenhuma prova agendada</h3>
        <p class="text-sm mb-5" style="color: #8A90A8">Agende suas provas e o algoritmo prioriza o que estudar primeiro.</p>
        <button class="inline-flex items-center gap-2 px-5 py-2.5 rounded-[14px] font-semibold text-sm text-white" style="background: #6F3FF5; box-shadow: 0 4px 12px rgba(111,63,245,0.25)" @click="showCreateModal = true">
          <Plus class="w-4 h-4" /> Agendar primeira prova
        </button>
      </div>

      <!-- Cards Grid -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div
          v-for="exam in filteredExams"
          :key="exam.id"
          class="rounded-[24px] p-6 relative group transition-all"
          style="background: var(--bg-card); border: 1px solid #E7EAF3; box-shadow: 0 8px 24px rgba(45, 35, 66, 0.08)"
        >
          <!-- Delete -->
          <button class="absolute top-4 right-4 p-2 opacity-0 group-hover:opacity-100 transition-opacity" style="color: #8A90A8" @click="handleDelete(exam.id)">
            <X class="w-4 h-4" />
          </button>

          <div class="flex justify-between items-start mb-3">
            <h3 class="font-bold text-lg" style="color: #1F2343">{{ exam.title }}</h3>
            <span
              class="px-3 py-1 rounded-full text-[10px] font-bold uppercase shrink-0 ml-2"
              :style="{
                background: exam.urgency_color === 'red' ? '#ffdad6' : exam.urgency_color === 'yellow' ? '#FFF8E1' : '#F0FDF4',
                color: exam.urgency_color === 'red' ? '#ba1a1a' : exam.urgency_color === 'yellow' ? '#B8860B' : '#16A34A',
              }"
            >{{ exam.days_remaining }} dias</span>
          </div>

          <p class="text-sm mb-5" style="color: #50597A">Cadernos: {{ exam.topics?.map(t => t.name).join(', ') || '—' }}</p>

          <div class="flex items-center gap-2 text-sm font-bold" style="color: #6F3FF5">
            <Eye class="w-4 h-4" /> Ver detalhes
          </div>
        </div>
      </div>
    </section>

    <ExamCreateModal v-if="showCreateModal" @close="showCreateModal = false" @created="handleCreated" />
  </div>
</template>
