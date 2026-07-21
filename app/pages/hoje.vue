<template>
  <div class="p-4 sm:p-6 pb-20 lg:pb-6 max-w-5xl mx-auto">
    <!-- Greeting + Streak -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div class="flex items-center gap-3">
        <UiBaigiMascot state="idle" :visible="true" :size="48" />
        <div>
        <h1 class="font-heading font-bold text-3xl text-base-primary">
          {{ greeting }}, <span class="text-accent-primary opacity-85">{{ auth.user?.name?.split(' ')[0] ?? 'estudante' }}</span>
        </h1>
        <p class="text-base-muted mt-1">Vamos manter seu ritmo hoje.</p>
        </div>
      </div>
      <div class="flex items-center gap-2 shrink-0 px-3 py-2 rounded-xl bg-surface-secondary">
        <span class="text-2xl font-semibold text-accent-primary leading-none">{{ stats?.streak ?? 0 }}</span>
        <div class="flex flex-col items-start">
          <span class="text-xs text-base-muted">dias 🔥</span>
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
          <button class="btn-primary !py-1 !px-3 !min-h-[2.75rem] !text-small" @click="applyRetention">Ajustar</button>
          <button class="btn-secondary !py-1 !px-3 !min-h-[2.75rem] !text-small" @click="dismissRetention">Ignorar</button>
        </div>
      </div>
    </div>

    <!-- Survival mode -->
    <div v-if="survivalActive" class="mt-4 p-4 rounded-xl bg-warning/10 border border-warning/30 flex items-center gap-3">
      <ShieldAlert :size="20" class="text-warning shrink-0" />
      <p class="text-small text-base-primary flex-1">🆘 Modo Sobrevivência ativo — apenas os 20 cards mais urgentes.</p>
      <button class="btn-secondary !py-1 !px-3 !min-h-[2.75rem] !text-small" @click="toggleSurvivalMode(false)">Desativar</button>
    </div>
    <div v-else-if="backlog?.suggest_survival_mode" class="mt-4 p-4 rounded-xl bg-danger/10 border border-danger/30 flex items-center gap-3">
      <ShieldAlert :size="20" class="text-danger shrink-0" />
      <p class="text-small text-base-primary flex-1">Backlog grande ({{ backlog.overdue_count }} cards)? Ative o Modo Sobrevivência.</p>
      <button class="btn-primary !py-1 !px-3 !min-h-[2.75rem] !text-small" @click="toggleSurvivalMode(true)">Ativar</button>
    </div>

    <!-- CTA Hero -->
    <div v-if="(stats?.due_today ?? 0) > 0 || (backlog?.overdue_count ?? 0) > 0" class="card-warm mt-6 py-5 px-5">
      <div class="flex items-center justify-between mb-3">
        <p class="font-heading font-semibold text-2xl text-base-primary">🎯 {{ totalCards }} cards para revisar<span class="text-sm text-base-muted font-normal"> · {{ mainTopicName }}</span></p>
        <span class="text-xs text-base-muted">~{{ backlog?.estimated_minutes ?? Math.ceil(totalCards * 0.25) }} min</span>
      </div>
      <div class="border-t border-base pt-3 mb-3">
        <div class="h-1.5 rounded-full bg-[var(--bg-soft)] overflow-hidden">
          <div
            class="h-1.5 rounded-full bg-primary-500 transition-all duration-500 ease-out"
            :style="{ width: progressPercent + '%' }"
          />
        </div>
      </div>
      <div class="flex items-center justify-between">
        <span class="text-micro text-base-secondary">{{ stats?.reviewed_today ?? 0 }} revisados hoje</span>
        <NuxtLink to="/revisar" class="btn-primary glow-primary">Começar revisão</NuxtLink>
      </div>
    </div>

    <!-- Empty state: no cards at all -->
    <div v-else-if="!stats?.total_cards" class="card mt-6 text-center py-10">
      <p class="text-title text-base-secondary mb-2">Pare de esquecer o que estuda</p>
      <p class="text-small text-base-muted mb-4">Crie um caderno, cole seu material e a IA gera flashcards em segundos.</p>
      <div class="flex gap-3 justify-center">
        <NuxtLink to="/cadernos" class="btn-primary">Criar caderno</NuxtLink>
        <NuxtLink to="/importar" class="btn-secondary">Importar Anki</NuxtLink>
      </div>
    </div>

    <!-- All caught up -->
    <div v-else class="card mt-6 text-center py-8">
      <p class="text-title text-base-secondary">Tudo em dia! 🎉</p>
      <p class="text-small text-base-muted mt-1">Que tal gerar novos cards?</p>
      <NuxtLink to="/cadernos" class="btn-primary mt-4 inline-flex">Ir pra Cadernos</NuxtLink>
    </div>

    <!-- Seu ritmo + Ações rápidas -->
    <div v-if="stats" class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
      <div class="card md:col-span-2 h-full flex flex-col justify-between">
        <div class="flex items-center justify-between mb-3">
          <p class="text-xs uppercase tracking-wider text-base-secondary font-medium">Seu ritmo hoje</p>
          <span class="text-lg font-semibold text-base-primary">{{ stats.due_today ?? 0 }} <span class="text-xs font-normal text-base-secondary">restantes</span></span>
        </div>
        <div class="h-1 rounded-full bg-[var(--bg-soft)] overflow-hidden">
          <div class="h-1 rounded-full bg-primary-500 transition-all duration-500" :style="{ width: progressPercent + '%' }" />
        </div>
        <div class="flex justify-between text-xs text-base-muted mt-2">
          <span>{{ stats.reviewed_today ?? 0 }} revisados</span>
          <span>{{ progressPercent }}%</span>
        </div>
      </div>
      <div class="flex flex-col gap-2 h-full">
        <NuxtLink to="/revisar?errors_only=1" class="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-primary-50 text-primary-500 text-small font-medium hover:bg-primary-100 border border-primary-200 transition-colors flex-1">
          Revisar só erros
        </NuxtLink>
        <NuxtLink to="/importar" class="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-primary-50 text-primary-500 text-small font-medium hover:bg-primary-100 border border-primary-200 transition-colors flex-1">
          Importar Anki
        </NuxtLink>
      </div>
    </div>

    <!-- Podcast card -->
    <div v-if="auth.user?.plan !== 'free' && (stats?.reviewed_today ?? 0) > 0" class="mt-6">
      <NuxtLink to="/podcasts" class="card flex items-center gap-4 hover:border-accent-primary/30 transition-colors">
        <span class="text-3xl">🎧</span>
        <div class="flex-1">
          <p class="text-small font-medium text-base-primary">Ouça seus pontos fracos</p>
          <p class="text-micro text-base-muted">Gere um podcast dentro de um caderno</p>
        </div>
        <span class="text-accent-primary text-small">→</span>
      </NuxtLink>
    </div>

    <!-- Pra hoje (max 3 actions) -->
    <div v-if="pendingActions.length" class="mt-10">
      <p class="text-label mb-3">Pra hoje</p>
      <div class="space-y-2">
        <div v-for="action in pendingActions" :key="action.label" class="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-[var(--bg-card)] border border-base shadow-sm">
          <span class="text-small text-base-primary truncate min-w-0">{{ action.label }}</span>
          <NuxtLink :to="action.url" class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary-50 text-primary-500 text-small font-medium hover:bg-primary-100 transition-colors shrink-0">
            {{ action.action_label }}
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- Continuar estudando -->
    <div v-if="topicProgress.length" class="mt-10">
      <p class="text-label mb-3">Continuar estudando</p>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <NuxtLink
          v-for="tp in topicProgress.slice(0, 4)"
          :key="tp.id"
          :to="`/cadernos?topic=${tp.id}`"
          class="card-interactive"
        >
          <p class="text-small font-medium text-base-primary truncate">{{ tp.name }}</p>
          <div class="flex items-center gap-2 mt-2">
            <div class="flex-1 h-1 rounded-full bg-surface-secondary">
              <div
                class="h-1 rounded-full bg-primary-500 transition-all"
                :style="{ width: Math.round(tp.progress * 100) + '%' }"
              />
            </div>
            <span class="text-xs text-base-muted">{{ Math.round(tp.progress * 100) }}%</span>
          </div>
          <p class="text-micro text-base-muted mt-1">{{ tp.flashcards_count }} cards</p>
        </NuxtLink>
      </div>
    </div>

    <!-- Activation checklist -->
    <div v-if="stats" class="mt-10">
      <!-- debug -->
      <UiActivationChecklist
        :has-topics="Number(stats.total_decks) > 0"
        :has-material="Number(stats.total_decks) > 0"
        :has-cards="Number(stats.total_cards) > 0"
        :has-reviewed="Number(stats.cards_reviewed_today) > 0 || Number(stats.streak) > 0"
        :streak="Number(stats.streak)"
      />
    </div>

    <!-- AI Usage -->
    <div v-if="featureUsage.usage.value && hasLimitedFeatures" class="mt-10">
      <p class="text-label mb-3">Uso de IA este mês</p>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div v-for="(data, key) in limitedFeatures" :key="key" class="card py-3 px-4">
          <p class="text-micro text-base-muted mb-1">{{ featureLabels[key] }}</p>
          <p class="text-title text-base-primary">{{ data.used }}/{{ data.limit }}</p>
          <div class="h-1 rounded-full bg-surface-secondary mt-2 overflow-hidden">
            <div
              class="h-1 rounded-full bg-primary-500 transition-all"
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
  cards_ai: 'Gerar cards',
  pdf_upload: 'Uploads PDF',
  pdf_to_note: 'Processar PDF',
  agent_chat: 'Tira-dúvidas',
  podcast: 'Revisão em áudio',
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

const mainTopicName = computed(() => {
  if (!topicProgress.value.length) return ''
  return topicProgress.value[0]?.name ?? ''
})

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
