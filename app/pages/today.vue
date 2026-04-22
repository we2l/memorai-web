<template>
  <div class="p-6 max-w-3xl mx-auto">
    <!-- Greeting + Streak -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-display">
          {{ greeting }}, <span class="text-accent-primary opacity-85">{{ auth.user?.name?.split(' ')[0] ?? 'estudante' }}</span>
        </h1>
        <p class="text-base-muted mt-1">Vamos manter seu ritmo hoje.</p>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <span class="text-[2rem] font-semibold text-accent-primary leading-none">{{ stats?.streak ?? 0 }}</span>
        <div class="flex flex-col items-start">
          <span class="text-micro text-base-muted">dias 🔥</span>
          <UiSparkline v-if="sparklineData.length" :data="sparklineData" :width="60" :height="18" />
        </div>
      </div>
    </div>

    <!-- Retention suggestion banner -->
    <div v-if="retentionSuggestion?.has_suggestion" class="mt-4 p-4 rounded-xl bg-warning/10 border border-warning/30 flex items-start gap-3">
      <TrendingDown :size="20" class="text-warning shrink-0 mt-0.5" />
      <div class="flex-1">
        <p class="text-small text-base-primary">Muitas reviews acumulando? Reduzir retenção de {{ Math.round(retentionSuggestion.current_retention * 100) }}% pra {{ Math.round(retentionSuggestion.suggested_retention * 100) }}% eliminaria ~{{ retentionSuggestion.cards_eliminated }} cards hoje.</p>
        <div class="flex gap-2 mt-2">
          <button class="btn-primary !py-1 !px-3 !min-h-0 !text-micro" @click="applyRetention">Ajustar</button>
          <button class="btn-secondary !py-1 !px-3 !min-h-0 !text-micro" @click="dismissRetention">Ignorar</button>
        </div>
      </div>
    </div>

    <!-- Survival mode -->
    <div v-if="survivalActive" class="mt-4 p-4 rounded-xl bg-warning/10 border border-warning/30 flex items-center gap-3">
      <ShieldAlert :size="20" class="text-warning shrink-0" />
      <p class="text-small text-base-primary flex-1">🆘 Modo Sobrevivência ativo — apenas os 20 cards mais urgentes.</p>
      <button class="btn-secondary !py-1 !px-3 !min-h-0 !text-micro" @click="toggleSurvivalMode(false)">Desativar</button>
    </div>
    <div v-else-if="backlog?.suggest_survival_mode" class="mt-4 p-4 rounded-xl bg-danger/10 border border-danger/30 flex items-center gap-3">
      <ShieldAlert :size="20" class="text-danger shrink-0" />
      <p class="text-small text-base-primary flex-1">Backlog grande ({{ backlog.overdue_count }} cards)? Ative o Modo Sobrevivência.</p>
      <button class="btn-primary !py-1 !px-3 !min-h-0 !text-micro" @click="toggleSurvivalMode(true)">Ativar</button>
    </div>

    <!-- CTA Hero -->
    <div v-if="(stats?.due_today ?? 0) > 0 || (backlog?.overdue_count ?? 0) > 0" class="card-warm mt-6 py-5 px-5" style="background: linear-gradient(90deg, rgba(217,119,6,0.06), transparent);">
      <div class="flex items-center justify-between mb-2">
        <p class="text-title text-base-primary">🎯 {{ totalCards }} cards para revisar</p>
        <span class="text-small text-base-muted">~{{ backlog?.estimated_minutes ?? Math.ceil(totalCards * 0.25) }} min</span>
      </div>
      <div class="h-3 rounded-full bg-surface-tertiary overflow-hidden mb-3">
        <div
          class="h-3 rounded-full transition-all duration-500 ease-out glow-success"
          :class="progressPercent > 80 ? 'bg-success' : progressPercent > 40 ? 'bg-warning' : 'bg-accent-primary'"
          :style="{ width: progressPercent + '%' }"
        />
      </div>
      <div class="flex items-center justify-between">
        <span class="text-micro text-base-muted">{{ stats?.reviewed_today ?? 0 }} revisados hoje</span>
        <NuxtLink to="/review" class="btn-primary glow-primary">Começar revisão</NuxtLink>
      </div>
    </div>

    <!-- Empty state: no cards at all -->
    <div v-else-if="!stats?.total_cards" class="card mt-6 text-center py-10">
      <p class="text-title text-base-secondary mb-2">Comece a estudar!</p>
      <p class="text-small text-base-muted mb-4">Crie seu primeiro card em 30 segundos ou suba um PDF.</p>
      <div class="flex gap-3 justify-center">
        <NuxtLink to="/topics" class="btn-primary">Criar tópico</NuxtLink>
        <NuxtLink to="/import" class="btn-secondary">Importar Anki</NuxtLink>
      </div>
    </div>

    <!-- All caught up -->
    <div v-else class="card mt-6 text-center py-8">
      <p class="text-title text-base-secondary">Tudo em dia! 🎉</p>
      <p class="text-small text-base-muted mt-1">Que tal gerar novos cards?</p>
      <NuxtLink to="/topics" class="btn-primary mt-4 inline-flex">Ir pra Tópicos</NuxtLink>
    </div>

    <!-- Pra hoje (max 3 actions) -->
    <div v-if="pendingActions.length" class="mt-8">
      <p class="text-label mb-3">Pra hoje</p>
      <div class="space-y-2">
        <div v-for="action in pendingActions" :key="action.label" class="flex items-center justify-between px-4 py-3 rounded-lg bg-surface-secondary">
          <span class="text-small text-base-primary">{{ action.label }}</span>
          <NuxtLink :to="action.url" class="btn-secondary !py-1 !px-3 !min-h-0 text-micro shrink-0">
            {{ action.action_label }}
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- Continuar estudando -->
    <div v-if="topicProgress.length" class="mt-8">
      <p class="text-label mb-3">Continuar estudando</p>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <NuxtLink
          v-for="tp in topicProgress.slice(0, 4)"
          :key="tp.id"
          :to="`/topics?topic=${tp.id}`"
          class="card-interactive"
        >
          <p class="text-small font-medium text-base-primary truncate">{{ tp.name }}</p>
          <div class="flex items-center gap-2 mt-2">
            <div class="flex-1 h-1.5 rounded-full bg-surface-tertiary">
              <div
                class="h-1.5 rounded-full transition-all"
                :class="tp.progress < 0.3 ? 'bg-danger' : tp.progress < 0.7 ? 'bg-warning' : 'bg-success'"
                :style="{ width: Math.round(tp.progress * 100) + '%' }"
              />
            </div>
            <span class="text-micro text-base-muted">{{ Math.round(tp.progress * 100) }}%</span>
          </div>
          <p class="text-micro text-base-muted mt-1">{{ tp.flashcards_count }} cards</p>
        </NuxtLink>
      </div>
    </div>

    <!-- AI Usage -->
    <div v-if="featureUsage.usage.value && hasLimitedFeatures" class="mt-8">
      <p class="text-label mb-3">Uso de IA este mês</p>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div v-for="(data, key) in limitedFeatures" :key="key" class="card py-3 px-4">
          <p class="text-micro text-base-muted mb-1">{{ featureLabels[key] }}</p>
          <p class="text-title text-base-primary">{{ data.used }}/{{ data.limit }}</p>
          <div class="h-1.5 rounded-full bg-surface-tertiary mt-2 overflow-hidden">
            <div
              class="h-1.5 rounded-full transition-all"
              :class="data.remaining === 0 ? 'bg-danger' : data.used / data.limit > 0.8 ? 'bg-warning' : 'bg-accent-primary'"
              :style="{ width: Math.min(100, (data.used / data.limit) * 100) + '%' }"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ShieldAlert, TrendingDown } from 'lucide-vue-next'
import type { Stats, TopicProgress, BacklogStats } from '~/types'

const auth = useAuthStore()
const featureUsage = useFeatureUsage()
const { $api } = useNuxtApp()

const featureLabels: Record<string, string> = {
  cards_ai: 'Cards IA',
  pdf_upload: 'Uploads PDF',
  agent_chat: 'Tirar dúvidas',
  podcast: 'Podcasts',
}

const limitedFeatures = computed(() => {
  if (!featureUsage.usage.value) return {}
  const result: Record<string, any> = {}
  for (const [key, data] of Object.entries(featureUsage.usage.value.features)) {
    if (data.limit !== null && data.limit > 0) {
      result[key] = data
    }
  }
  return result
})

const hasLimitedFeatures = computed(() => Object.keys(limitedFeatures.value).length > 0)

const stats = ref<Stats | null>(null)
const topicProgress = ref<TopicProgress[]>([])
const backlog = ref<BacklogStats | null>(null)
const retentionSuggestion = ref<any>(null)
const survivalActive = ref(false)
const sparklineData = ref<number[]>([])
const pendingActions = ref<any[]>([])

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
})

const totalCards = computed(() => (stats.value?.due_today ?? 0) + (backlog.value?.overdue_count ?? 0))

const totalDue = computed(() =>
  (stats.value?.due_today ?? 0) + (stats.value?.reviewed_today ?? 0)
)

const progressPercent = computed(() => {
  if (!totalDue.value) return 0
  return Math.round(((stats.value?.reviewed_today ?? 0) / totalDue.value) * 100)
})

async function loadData() {
  const [statsRes, progressRes, backlogRes, retRes, settingsRes, sparkRes, actionsRes] = await Promise.all([
    $api<any>('/stats'),
    $api<any>('/topics/progress'),
    $api<any>('/review/backlog-stats'),
    $api<any>('/review/retention-suggestion').catch(() => ({ data: { has_suggestion: false } })),
    $api<any>('/settings'),
    $api<any>('/stats/sparkline').catch(() => ({ data: [] })),
    $api<any>('/stats/pending-actions').catch(() => ({ data: [] })),
  ])
  stats.value = statsRes.data
  topicProgress.value = progressRes.data
  backlog.value = backlogRes.data
  retentionSuggestion.value = retRes.data
  survivalActive.value = settingsRes.data.survival_mode ?? false
  sparklineData.value = sparkRes.data
  pendingActions.value = actionsRes.data
  featureUsage.fetchUsage()
}

async function toggleSurvivalMode(enabled: boolean) {
  try {
    await $api('/review/survival-mode', { method: 'POST', body: { enabled } })
    await loadData()
  } catch {}
}

async function applyRetention() {
  if (!retentionSuggestion.value?.suggested_retention) return
  try {
    await $api('/review/apply-retention', {
      method: 'POST',
      body: { desired_retention: retentionSuggestion.value.suggested_retention },
    })
    retentionSuggestion.value = { has_suggestion: false }
    await loadData()
  } catch {}
}

function dismissRetention() {
  retentionSuggestion.value = { has_suggestion: false }
}

onMounted(loadData)

const route = useRoute()
watch(() => route.fullPath, () => {
  if (route.path === '/today') loadData()
})
</script>
