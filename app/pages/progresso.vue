<template>
  <div class="p-4 sm:p-6 pb-20 lg:pb-6 max-w-4xl mx-auto">
    <h1 class="text-display mb-8">Progresso</h1>

    <!-- Loading -->
    <div v-if="loading" class="space-y-6">
      <div class="skeleton h-24 rounded-xl" />
      <div class="skeleton h-40 rounded-xl" />
      <div class="skeleton h-32 rounded-xl" />
    </div>

    <template v-else-if="data">
      <!-- Mastery hero -->
      <div class="card py-6 px-6 mb-6 text-center">
        <p class="text-small text-base-muted mb-1">Domínio geral</p>
        <p class="text-4xl font-bold text-base-primary">{{ data.mastery_pct }}%</p>
        <p class="text-micro text-base-muted mt-2">dos seus cards estão dominados</p>
        <!-- Card states bar -->
        <div class="flex h-3 rounded-full overflow-hidden mt-4 bg-surface-tertiary">
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
            class="bg-[#A8A29E] transition-all"
            :style="{ width: pct(data.card_states.new) }"
          />
        </div>
        <div class="flex justify-center gap-4 mt-3 text-micro text-base-muted">
          <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-success inline-block" /> Dominados ({{ data.card_states.mature }})</span>
          <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-warning inline-block" /> Aprendendo ({{ data.card_states.learning }})</span>
          <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-[#A8A29E] inline-block" /> Novos ({{ data.card_states.new }})</span>
        </div>
      </div>

      <!-- Retention + Streak row -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div class="card py-5 px-5 text-center">
          <p class="text-small text-base-muted mb-1">Retenção (7 dias)</p>
          <p class="text-2xl font-bold" :class="retentionColor(data.retention_7d)">
            {{ data.retention_7d != null ? data.retention_7d + '%' : '—' }}
          </p>
        </div>
        <div class="card py-5 px-5 text-center">
          <p class="text-small text-base-muted mb-1">Retenção (30 dias)</p>
          <p class="text-2xl font-bold" :class="retentionColor(data.retention_30d)">
            {{ data.retention_30d != null ? data.retention_30d + '%' : '—' }}
          </p>
        </div>
        <div class="card py-5 px-5 text-center">
          <p class="text-small text-base-muted mb-1">Streak</p>
          <p class="text-2xl font-bold text-base-primary">{{ data.streak }} 🔥</p>
        </div>
      </div>

      <!-- Heatmap -->
      <div class="card py-5 px-5 mb-6">
        <h2 class="text-title mb-4">Consistência (últimos 90 dias)</h2>
        <div class="flex flex-wrap gap-[3px]">
          <div
            v-for="day in heatmapDays"
            :key="day.date"
            class="w-3 h-3 rounded-sm transition-colors"
            :class="heatmapColor(day.count)"
            :title="`${day.date}: ${day.count} revisões`"
          />
        </div>
        <div class="flex items-center gap-2 mt-3 text-micro text-base-muted">
          <span>Menos</span>
          <span class="w-3 h-3 rounded-sm bg-surface-tertiary" />
          <span class="w-3 h-3 rounded-sm bg-success/20" />
          <span class="w-3 h-3 rounded-sm bg-success/50" />
          <span class="w-3 h-3 rounded-sm bg-success/80" />
          <span class="w-3 h-3 rounded-sm bg-success" />
          <span>Mais</span>
        </div>
      </div>

      <!-- Weak topics -->
      <div v-if="data.weak_topics.length" class="card py-5 px-5">
        <h2 class="text-title mb-4">Cadernos mais fracos</h2>
        <div class="space-y-3">
          <div v-for="topic in data.weak_topics" :key="topic.id" class="flex items-center gap-3">
            <div class="flex-1 min-w-0">
              <p class="text-small text-base-primary truncate">{{ topic.name }}</p>
              <div class="flex items-center gap-2 mt-1">
                <div class="flex-1 h-2 rounded-full bg-surface-tertiary">
                  <div
                    class="h-2 rounded-full bg-danger transition-all"
                    :style="{ width: topic.mastery_pct + '%' }"
                  />
                </div>
                <span class="text-micro text-base-muted">{{ topic.mastery_pct }}%</span>
              </div>
            </div>
            <NuxtLink
              :to="`/revisar?topic_id=${topic.id}`"
              class="btn-secondary !py-1.5 !px-3 !min-h-0 text-micro shrink-0"
            >
              Revisar
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="!data.streak && data.mastery_pct === 0" class="card text-center py-10 mt-6">
        <p class="text-base-secondary">Revise seus primeiros cards pra ver seu progresso aqui.</p>
        <NuxtLink to="/revisar" class="btn-primary mt-4 inline-flex">Começar revisão</NuxtLink>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
const { $api } = useNuxtApp()

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
  if (val >= 80) return 'text-success'
  if (val >= 60) return 'text-warning'
  return 'text-danger'
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
  if (count === 0) return 'bg-surface-tertiary'
  if (count <= 5) return 'bg-success/20'
  if (count <= 15) return 'bg-success/50'
  if (count <= 30) return 'bg-success/80'
  return 'bg-success'
}

onMounted(async () => {
  try {
    const res = await $api<any>('/stats/progress')
    data.value = res.data
  } finally {
    loading.value = false
  }
})
</script>
