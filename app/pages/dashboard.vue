<template>
  <div class="p-6 max-w-5xl mx-auto">
    <!-- Greeting -->
    <h1 class="text-display">
      {{ greeting }}, <span class="text-accent-primary opacity-85">{{ auth.user?.name?.split(' ')[0] ?? 'estudante' }}</span>
    </h1>
    <p class="text-base-muted mt-1">Vamos manter seu ritmo hoje.</p>

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

    <!-- Survival mode active -->
    <div v-if="survivalActive" class="mt-4 p-4 rounded-xl bg-warning/10 border border-warning/30 flex items-center gap-3">
      <ShieldAlert :size="20" class="text-warning shrink-0" />
      <div class="flex-1">
        <p class="text-small text-base-primary">🆘 Modo Sobrevivência ativo — apenas os 20 cards mais urgentes serão mostrados.</p>
      </div>
      <button class="btn-secondary !py-1 !px-3 !min-h-0 !text-micro" @click="toggleSurvivalMode(false)">Desativar</button>
    </div>

    <!-- Survival mode suggestion -->
    <div v-else-if="backlog?.suggest_survival_mode" class="mt-4 p-4 rounded-xl bg-danger/10 border border-danger/30 flex items-center gap-3">
      <ShieldAlert :size="20" class="text-danger shrink-0" />
      <div class="flex-1">
        <p class="text-small text-base-primary">Backlog grande ({{ backlog.overdue_count }} cards)? Ative o Modo Sobrevivência — só os 20 mais urgentes.</p>
      </div>
      <button class="btn-primary !py-1 !px-3 !min-h-0 !text-micro" @click="toggleSurvivalMode(true)">Ativar</button>
    </div>

    <!-- Backlog bar — herói do dashboard -->
    <div v-if="backlog && backlog.overdue_count > 0" class="card-warm mt-6 py-5 px-5 flex items-center gap-5" style="background: linear-gradient(90deg, rgba(217,119,6,0.06), transparent);">
      <div class="flex-1">
        <div class="flex items-center justify-between mb-2">
          <p class="text-title text-base-primary">Dívida de revisão</p>
          <span class="text-small text-base-muted">~{{ backlog.estimated_minutes }} min para zerar</span>
        </div>
        <div class="h-3 rounded-full bg-surface-tertiary overflow-hidden">
          <div
            class="h-3 rounded-full transition-all duration-500 ease-out"
            :class="backlog.overdue_count > 50 ? 'bg-danger' : backlog.overdue_count > 10 ? 'bg-warning' : 'bg-success glow-success'"
            :style="{ width: Math.min(100, backlog.overdue_count) + '%' }"
          />
        </div>
        <p class="text-small text-base-muted mt-2">{{ backlog.overdue_count }} cards atrasados · {{ backlog.reviews_done_today }} reviews hoje</p>
      </div>
      <NuxtLink to="/review?backlog=1" class="btn-primary shrink-0">Revisar agora</NuxtLink>
    </div>

    <!-- Progress + Streak -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
      <!-- Progress card -->
      <div class="card md:col-span-2 flex flex-col gap-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-title">Seu ritmo hoje</p>
            <p class="text-base-muted text-small mt-0.5">
              {{ stats?.reviews_done ?? 0 }}/{{ stats?.reviews_limit ?? '∞' }} reviews · {{ stats?.new_done ?? 0 }}/{{ stats?.new_limit ?? '∞' }} novos
            </p>
          </div>
          <span class="badge badge-primary">Meta diária</span>
        </div>

        <!-- Progress bar -->
        <div class="w-full h-3 rounded-full bg-surface-tertiary overflow-hidden">
          <div
            class="h-3 rounded-full bg-success transition-all duration-500 ease-out glow-success"
            :style="{ width: progressPercent + '%' }"
          />
        </div>

        <div class="flex justify-between text-micro text-base-muted">
          <span>Ainda faltam: {{ stats?.due_today ?? 0 }}</span>
          <span>Revisados: {{ stats?.reviewed_today ?? 0 }}</span>
        </div>
      </div>

      <!-- Streak card -->
      <div class="card flex flex-col items-center justify-center text-center">
        <p class="text-label">Streak atual</p>
        <p class="text-[2.5rem] font-semibold text-accent-primary mt-2 leading-none">{{ stats?.streak ?? 0 }}</p>
        <p class="text-base-muted text-small mt-2">dias 🔥</p>
      </div>
    </div>

    <!-- Quick actions -->
    <p class="text-label mt-12 mb-4">Ações rápidas</p>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <NuxtLink to="/review" class="btn-primary glow-primary justify-center">
        <Play :size="18" /> Revisar agora
      </NuxtLink>
      <NuxtLink to="/review?errors_only=1" class="btn-secondary justify-center">
        <AlertCircle :size="18" /> Revisar só erros
      </NuxtLink>
      <NuxtLink to="/decks" class="btn-secondary justify-center">
        <Plus :size="18" /> Criar card
      </NuxtLink>
      <button class="btn-accent justify-center" disabled title="Em breve">
        <Upload :size="18" /> Subir PDF
      </button>
      <NuxtLink to="/import" class="btn-accent justify-center">
        <Upload :size="18" /> Importar Anki
      </NuxtLink>
    </div>

    <!-- Decks -->
    <div class="flex items-center justify-between mt-12 mb-4">
      <h2 class="text-headline">Seus decks</h2>
      <NuxtLink to="/decks" class="text-small text-accent-primary hover:underline">Ver todos</NuxtLink>
    </div>

    <div v-if="deckStore.loading" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div v-for="i in 2" :key="i" class="card">
        <div class="skeleton h-4 w-32 mb-3" />
        <div class="skeleton h-3 w-48 mb-4" />
        <div class="skeleton h-3 w-20" />
      </div>
    </div>

    <div v-else-if="deckStore.decks.length" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <NuxtLink
        v-for="deck in deckStore.decks.slice(0, 3)"
        :key="deck.id"
        :to="`/decks/${deck.id}`"
        class="card-interactive"
      >
        <div class="flex items-center justify-between mb-3">
          <p class="text-title">{{ deck.name }}</p>
          <span v-if="deck.cards_count" class="badge badge-success">{{ deck.cards_count }} cards</span>
        </div>
        <p v-if="deck.description" class="text-base-muted text-small">{{ deck.description }}</p>
      </NuxtLink>

      <NuxtLink to="/decks" class="flex flex-col items-center justify-center min-h-[120px] rounded-xl border border-dashed border-[#333] bg-transparent transition-all duration-200 cursor-pointer hover:bg-[#1E1E1E] hover:border-[#D97706]">
        <Plus :size="24" class="text-base-muted" />
        <span class="text-label mt-2">Novo deck</span>
      </NuxtLink>
    </div>

    <div v-else class="card text-center py-10">
      <p class="text-base-secondary">Nenhum deck ainda.</p>
      <NuxtLink to="/decks" class="btn-primary mt-4 inline-flex">Criar primeiro deck</NuxtLink>
    </div>

    <!-- Topic progress -->
    <div v-if="topicProgress.length" class="mt-12">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-headline">Progresso por tópico</h2>
        <NuxtLink to="/graph" class="text-small text-accent-primary hover:underline">Ver grafo</NuxtLink>
      </div>
      <div class="space-y-3">
        <div v-for="tp in topicProgress.slice(0, 5)" :key="tp.id" class="card flex items-center gap-4">
          <div class="flex-1 min-w-0">
            <p class="text-small text-base-primary truncate">{{ tp.name }}</p>
            <div class="flex items-center gap-2 mt-1">
              <div class="flex-1 h-1.5 rounded-full bg-surface-tertiary">
                <div
                  class="h-1.5 rounded-full transition-all"
                  :class="tp.progress < 0.3 ? 'bg-danger' : tp.progress < 0.7 ? 'bg-warning' : 'bg-success'"
                  :style="{ width: Math.round(tp.progress * 100) + '%' }"
                />
              </div>
              <span class="text-micro text-base-muted w-10 text-right">{{ Math.round(tp.progress * 100) }}%</span>
            </div>
          </div>
          <span class="text-micro text-base-muted shrink-0">{{ tp.review_count }}/{{ tp.flashcards_count }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Play, Plus, Upload, AlertCircle, ShieldAlert, TrendingDown } from 'lucide-vue-next'
import type { Stats, TopicProgress, BacklogStats } from '~/types'

const auth = useAuthStore()
const deckStore = useDeckStore()

const stats = ref<Stats | null>(null)
const topicProgress = ref<TopicProgress[]>([])
const backlog = ref<BacklogStats | null>(null)
const retentionSuggestion = ref<any>(null)
const survivalActive = ref(false)
const { $api } = useNuxtApp()

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
})

const totalDue = computed(() =>
  (stats.value?.due_today ?? 0) + (stats.value?.reviewed_today ?? 0)
)

const progressPercent = computed(() => {
  if (!totalDue.value) return 0
  return Math.round(((stats.value?.reviewed_today ?? 0) / totalDue.value) * 100)
})

async function loadData() {
  const [statsRes, , progressRes, backlogRes, retRes, settingsRes] = await Promise.all([
    $api<any>('/stats'),
    deckStore.fetchDecks(),
    $api<any>('/topics/progress'),
    $api<any>('/review/backlog-stats'),
    $api<any>('/review/retention-suggestion').catch(() => ({ data: { has_suggestion: false } })),
    $api<any>('/settings'),
  ])
  stats.value = statsRes.data
  topicProgress.value = progressRes.data
  backlog.value = backlogRes.data
  retentionSuggestion.value = retRes.data
  survivalActive.value = settingsRes.data.survival_mode ?? false
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

// Recarregar ao voltar pra página
const route = useRoute()
watch(() => route.fullPath, () => {
  if (route.path === '/dashboard') loadData()
})
</script>
