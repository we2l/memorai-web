<template>
  <!-- Hero: cards pendentes -->
  <section v-if="totalCards > 0" class="hero">
    <div class="hero__greeting">
      <img src="~/assets/mascot-baigi-bust.png" alt="" class="hero__mascot" />
      <span class="hero__greeting-text">{{ greeting }}, {{ firstName }}.</span>
    </div>

    <div class="hero__mission">
      <p v-if="nextExam" class="hero__exam-badge">📋 Prova em {{ nextExam.days_remaining }} dias</p>
      <p class="hero__subtitle">Hoje faltam apenas</p>
      <p class="hero__number">{{ totalCards }} cards.</p>
      <p class="hero__context">≈{{ estimatedMinutes }} min · {{ mainTopicName }}</p>
    </div>

    <NuxtLink to="/revisar" class="hero__cta">Começar revisão</NuxtLink>

    <div class="hero__progress">
      <div class="hero__progress-track" role="progressbar" :aria-valuenow="reviewedToday" :aria-valuemax="totalDue">
        <div class="hero__progress-fill" :style="{ width: progressPercent + '%' }" />
      </div>
      <span class="hero__progress-label">{{ reviewedToday }}/{{ totalDue }}</span>
    </div>
  </section>

  <!-- Hero: novo usuário (0 cards) -->
  <section v-else-if="totalUserCards === 0" class="hero">
    <div class="hero__greeting">
      <img src="~/assets/mascot-baigi-reading.png" alt="" class="w-11 h-11 object-contain shrink-0" />
      <div>
        <p class="text-xl font-bold text-base-primary">Comece por aqui.</p>
        <p class="text-[13px] text-base-muted mt-1">Importe um PDF ou crie um caderno pra gerar seus cards.</p>
      </div>
    </div>
    <div class="flex gap-3 mt-5">
      <NuxtLink to="/cadernos" class="hero__cta">Criar caderno</NuxtLink>
      <NuxtLink to="/importar" class="btn-secondary">Importar Anki</NuxtLink>
    </div>
  </section>

  <!-- Hero: tudo em dia -->
  <section v-else class="hero">
    <div class="hero__greeting">
      <img src="~/assets/mascot-baigi-celebrating.png" alt="" class="w-10 h-10 object-contain shrink-0" />
      <div>
        <p class="text-xl font-bold text-base-primary">Tudo em dia! 🎉</p>
        <p class="text-[13px] text-base-muted mt-1">{{ subtitle }}</p>
      </div>
    </div>
    <NuxtLink to="/cadernos" class="btn-secondary mt-5 inline-flex">Ir pra Cadernos</NuxtLink>
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
  padding-top: 8px;
}

.hero__greeting {
  display: flex;
  align-items: center;
  gap: 10px;
}
.hero__mascot {
  width: 32px;
  height: 32px;
  object-fit: contain;
}
.hero__greeting-text {
  font-size: 14px;
  color: var(--color-text-secondary);
}

.hero__mission {
  margin-top: 16px;
}
.hero__subtitle {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin-bottom: 2px;
}
.hero__number {
  font-size: 2.75rem;
  font-weight: 800;
  line-height: 1.1;
  color: var(--color-text-primary);
  letter-spacing: -0.03em;
}
@media (min-width: 640px) {
  .hero__number { font-size: 3.25rem; }
}
.hero__context {
  font-size: 13px;
  color: var(--color-text-muted);
  margin-top: 6px;
}

.hero__exam-badge {
  display: inline-flex;
  align-items: center;
  font-size: 11px;
  font-weight: 500;
  color: var(--color-warning);
  padding: 3px 10px;
  border-radius: 99px;
  background: color-mix(in srgb, var(--color-warning) 8%, transparent);
  margin-bottom: 10px;
}

.hero__cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-top: 24px;
  padding: 13px 32px;
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  background: var(--color-primary-500, var(--color-accent-primary));
  border-radius: 14px;
  transition: all 150ms ease-out;
  box-shadow: 0 4px 16px rgba(111, 63, 245, 0.22);
}
.hero__cta:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(111, 63, 245, 0.3);
  background: var(--color-primary-600, var(--color-accent-primary));
}

.hero__progress {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 20px;
  max-width: 280px;
}
.hero__progress-track {
  flex: 1;
  height: 4px;
  border-radius: 99px;
  background: var(--bg-soft);
  overflow: hidden;
}
.hero__progress-fill {
  height: 100%;
  border-radius: 99px;
  background: var(--color-primary-500, var(--color-accent-primary));
  opacity: 0.6;
  transition: width 500ms ease-out;
}
.hero__progress-label {
  font-size: 12px;
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}
</style>
