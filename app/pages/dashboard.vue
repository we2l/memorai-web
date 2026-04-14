<template>
  <div class="p-6 max-w-5xl mx-auto">
    <!-- Greeting -->
    <h1 class="text-display">
      {{ greeting }}, <span class="text-primary-400">{{ auth.user?.name?.split(' ')[0] ?? 'estudante' }}</span>
    </h1>
    <p class="text-base-secondary mt-1">Vamos manter seu ritmo hoje.</p>

    <!-- Progress + Streak -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
      <!-- Progress card -->
      <div class="card md:col-span-2 flex flex-col gap-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-title">Progresso de hoje</p>
            <p class="text-base-secondary text-small mt-0.5">
              {{ stats?.reviewed_today ?? 0 }} de {{ totalDue }} revisões completadas
            </p>
          </div>
          <span class="badge badge-primary">Meta diária</span>
        </div>

        <!-- Progress bar -->
        <div class="w-full h-2 rounded-full bg-surface-tertiary">
          <div
            class="h-2 rounded-full bg-primary-500 transition-all duration-300"
            :style="{ width: progressPercent + '%' }"
          />
        </div>

        <div class="flex justify-between text-micro text-base-muted">
          <span>● Pendentes: {{ stats?.due_today ?? 0 }}</span>
          <span>● Revisados: {{ stats?.reviewed_today ?? 0 }}</span>
        </div>
      </div>

      <!-- Streak card -->
      <div class="card flex flex-col items-center justify-center text-center">
        <p class="text-label">Streak atual</p>
        <p class="text-4xl font-bold text-base-primary mt-2">{{ stats?.streak ?? 0 }}</p>
        <p class="text-base-secondary text-small mt-1">dias 🔥</p>
      </div>
    </div>

    <!-- Quick actions -->
    <p class="text-label mt-10 mb-3">Ações rápidas</p>
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <NuxtLink to="/review" class="btn-primary glow-primary justify-center">
        <Play :size="18" /> Revisar agora
      </NuxtLink>
      <NuxtLink to="/decks" class="btn-secondary justify-center">
        <Plus :size="18" /> Criar card
      </NuxtLink>
      <button class="btn-accent justify-center" disabled title="Em breve">
        <Upload :size="18" /> Subir PDF
      </button>
    </div>

    <!-- Decks -->
    <div class="flex items-center justify-between mt-10 mb-4">
      <h2 class="text-headline">Seus decks</h2>
      <NuxtLink to="/decks" class="text-small text-primary-400 hover:underline">Ver todos</NuxtLink>
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

      <NuxtLink to="/decks" class="card-interactive flex flex-col items-center justify-center min-h-[120px] border border-dashed border-base">
        <Plus :size="24" class="text-base-muted" />
        <span class="text-label mt-2">Novo deck</span>
      </NuxtLink>
    </div>

    <div v-else class="card text-center py-10">
      <p class="text-base-secondary">Nenhum deck ainda.</p>
      <NuxtLink to="/decks" class="btn-primary mt-4 inline-flex">Criar primeiro deck</NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Play, Plus, Upload } from 'lucide-vue-next'
import type { Stats } from '~/types'

const auth = useAuthStore()
const deckStore = useDeckStore()

const stats = ref<Stats | null>(null)
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

onMounted(async () => {
  const [statsRes] = await Promise.all([
    $api<any>('/stats'),
    deckStore.fetchDecks(),
  ])
  stats.value = statsRes.data
})
</script>
