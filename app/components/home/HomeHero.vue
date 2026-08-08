<template>
  <!-- Hero: cards pendentes -->
  <section v-if="totalCards > 0" class="hero">
    <div class="hero__top">
      <div class="flex items-center gap-2">
        <img src="~/assets/mascot-baigi-bust.png" alt="" class="w-8 h-8 object-contain" />
        <span class="text-sm text-base-primary/80">{{ greeting }}, {{ firstName }}.</span>
      </div>
      <span v-if="streak > 1" class="text-xs text-base-muted">🔥 {{ streak }}</span>
    </div>

    <div class="hero__body">
      <p v-if="nextExam" class="text-xs text-warning font-medium mb-2">📋 Prova em {{ nextExam.days_remaining }} dias</p>
      <p class="text-sm text-base-secondary">Hoje faltam apenas</p>
      <p class="hero__number">{{ totalCards }} cards.</p>
      <p class="text-sm text-base-muted mt-1">≈{{ estimatedMinutes }} min · {{ mainTopicName }}</p>
    </div>

    <div class="hero__progress">
      <div class="hero__progress-track" role="progressbar" :aria-valuenow="reviewedToday" :aria-valuemax="totalDue">
        <div class="hero__progress-fill" :style="{ width: progressPercent + '%' }" />
      </div>
      <span class="text-xs text-base-muted font-mono">{{ reviewedToday }}/{{ totalDue }}</span>
    </div>

    <NuxtLink to="/revisar" class="hero__cta">Começar revisão</NuxtLink>
  </section>

  <!-- Hero: novo usuário (0 cards) -->
  <section v-else-if="totalUserCards === 0" class="hero hero--centered">
    <img src="~/assets/mascot-baigi-reading.png" alt="" class="w-20 h-20 object-contain" />
    <p class="text-xl font-bold text-base-primary mt-4">Comece por aqui.</p>
    <p class="text-sm text-base-muted mt-1">Importe um PDF ou crie um caderno pra gerar seus cards.</p>
    <div class="flex gap-3 mt-5">
      <NuxtLink to="/cadernos" class="hero__cta">Criar caderno</NuxtLink>
      <NuxtLink to="/importar" class="btn-secondary">Importar Anki</NuxtLink>
    </div>
  </section>

  <!-- Hero: tudo em dia -->
  <section v-else class="hero hero--centered">
    <img src="~/assets/mascot-baigi-celebrating.png" alt="" class="w-16 h-16 object-contain" />
    <p class="text-2xl font-bold text-base-primary mt-4">Tudo em dia! 🎉</p>
    <p class="text-sm text-base-muted mt-1">{{ subtitle }}</p>
    <NuxtLink to="/cadernos" class="btn-secondary mt-4 inline-flex">Ir pra Cadernos</NuxtLink>
  </section>
</template>

<script setup lang="ts">
import type { BacklogStats, Stats, TopicProgress } from '~/types'

const props = defineProps<{
  stats: Stats | null
  backlog: BacklogStats | null
  topicProgress: TopicProgress[]
  nextExam: { title: string; days_remaining: number } | null
  userName: string
}>()

const firstName = computed(() => props.userName?.split(' ')[0] ?? 'estudante')

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
})

const streak = computed(() => props.stats?.streak ?? 0)
const reviewedToday = computed(() => props.stats?.reviewed_today ?? 0)
const totalUserCards = computed(() => props.stats?.total_cards ?? 0)
const totalCards = computed(() => (props.stats?.due_today ?? 0) + (props.backlog?.overdue_count ?? 0))
const totalDue = computed(() => (props.stats?.due_today ?? 0) + reviewedToday.value)
const mainTopicName = computed(() => props.topicProgress[0]?.name ?? '')
const estimatedMinutes = computed(() => props.backlog?.estimated_minutes ?? Math.ceil(totalCards.value * 0.25))

const progressPercent = computed(() => {
  if (!totalDue.value) return 0
  return Math.round((reviewedToday.value / totalDue.value) * 100)
})

const subtitle = computed(() => {
  if (streak.value > 7) return `${streak.value} dias seguidos. Continue assim.`
  return 'Que tal gerar novos cards?'
})
</script>

<style scoped>
.hero {
  padding-top: 4px;
}
.hero--centered {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 16px;
}

.hero__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.hero__body {
  margin-top: 20px;
}

.hero__number {
  font-size: 2.5rem;
  font-weight: 800;
  line-height: 1.1;
  color: var(--color-text-primary);
  letter-spacing: -0.03em;
  margin-top: 2px;
}
@media (min-width: 640px) {
  .hero__number { font-size: 3rem; }
}

.hero__progress {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 20px;
}
.hero__progress-track {
  flex: 1;
  height: 5px;
  border-radius: 99px;
  background: var(--bg-soft);
  overflow: hidden;
}
.hero__progress-fill {
  height: 100%;
  border-radius: 99px;
  background: var(--color-primary-500, var(--color-accent-primary));
  opacity: 0.7;
  transition: width 500ms ease-out;
}

.hero__cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-top: 24px;
  padding: 14px 32px;
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  background: var(--color-primary-500, var(--color-accent-primary));
  border-radius: 14px;
  transition: all 150ms ease-out;
  box-shadow: 0 4px 16px rgba(111, 63, 245, 0.25);
}
.hero__cta:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(111, 63, 245, 0.3);
  background: var(--color-primary-600, var(--color-accent-primary));
}
</style>
