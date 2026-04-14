<template>
  <div class="p-6 max-w-5xl mx-auto">
    <h1 class="text-display mb-8">Estatísticas</h1>

    <!-- Loading -->
    <div v-if="loading" class="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <div v-for="i in 4" :key="i" class="card text-center py-6">
        <div class="skeleton h-3 w-16 mx-auto mb-3" />
        <div class="skeleton h-8 w-12 mx-auto" />
      </div>
    </div>

    <template v-else-if="stats">
      <!-- Overview cards -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        <div class="card text-center py-6">
          <p class="text-label">Total cards</p>
          <p class="text-3xl font-bold text-base-primary mt-2">{{ stats.total_cards }}</p>
        </div>
        <div class="card text-center py-6">
          <p class="text-label">Total decks</p>
          <p class="text-3xl font-bold text-base-primary mt-2">{{ stats.total_decks }}</p>
        </div>
        <div class="card text-center py-6">
          <p class="text-label">Pendentes hoje</p>
          <p class="text-3xl font-bold text-primary-400 mt-2">{{ stats.due_today }}</p>
        </div>
        <div class="card text-center py-6">
          <p class="text-label">Streak</p>
          <p class="text-3xl font-bold text-base-primary mt-2">{{ stats.streak }} 🔥</p>
        </div>
      </div>

      <!-- Today's reviews -->
      <h2 class="text-headline mb-4">Revisões de hoje</h2>
      <div class="card mb-10">
        <div class="flex items-center justify-between mb-4">
          <p class="text-base-secondary">{{ stats.reviewed_today }} cards revisados</p>
        </div>

        <!-- Rating bars -->
        <div class="space-y-3">
          <div v-for="item in ratingBars" :key="item.label" class="flex items-center gap-3">
            <span class="text-small w-14 text-right" :class="item.textClass">{{ item.label }}</span>
            <div class="flex-1 h-3 rounded-full bg-surface-tertiary">
              <div
                class="h-3 rounded-full transition-all duration-300"
                :class="item.barClass"
                :style="{ width: item.percent + '%' }"
              />
            </div>
            <span class="text-small text-base-muted w-8">{{ item.count }}</span>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="!stats.reviewed_today && !stats.total_cards" class="card text-center py-10">
        <p class="text-base-secondary">Comece criando decks e flashcards para ver suas estatísticas.</p>
        <NuxtLink to="/decks" class="btn-primary mt-4 inline-flex">Criar primeiro deck</NuxtLink>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { Stats } from '~/types'

const { $api } = useNuxtApp()
const stats = ref<Stats | null>(null)
const loading = ref(true)

const ratingBars = computed(() => {
  if (!stats.value) return []
  const r = stats.value.ratings_today
  const total = r.again + r.hard + r.good + r.easy || 1
  return [
    { label: 'Errei', count: r.again, percent: (r.again / total) * 100, barClass: 'bg-danger', textClass: 'text-danger' },
    { label: 'Difícil', count: r.hard, percent: (r.hard / total) * 100, barClass: 'bg-warning', textClass: 'text-warning' },
    { label: 'Bom', count: r.good, percent: (r.good / total) * 100, barClass: 'bg-success', textClass: 'text-success' },
    { label: 'Fácil', count: r.easy, percent: (r.easy / total) * 100, barClass: 'bg-primary-500', textClass: 'text-primary-400' },
  ]
})

onMounted(async () => {
  try {
    const res = await $api<any>('/stats')
    stats.value = res.data
  } finally {
    loading.value = false
  }
})
</script>
