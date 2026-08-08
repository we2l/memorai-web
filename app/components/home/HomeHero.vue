<template>
  <!-- Hero: cards pendentes -->
  <section v-if="totalCards > 0" class="hero">
    <div class="hero__row hero__row--greeting">
      <img src="~/assets/mascot-baigi-bust.png" alt="" class="hero__mascot" />
      <span class="hero__greeting-text">{{ greeting }}, {{ firstName }}.</span>
    </div>

    <div class="hero__row hero__row--metric">
      <div class="hero__metric">
        <p v-if="nextExam" class="hero__exam-badge">📋 Prova em {{ nextExam.days_remaining }} dias</p>
        <p class="hero__label">Hoje faltam apenas</p>
        <h1 class="hero__number">{{ totalCards }} cards.</h1>
        <p class="hero__context">≈{{ estimatedMinutes }} min · {{ mainTopicName }}</p>
      </div>
    </div>

    <div class="hero__row hero__row--actions">
      <NuxtLink to="/revisar" class="hero__cta">Começar revisão</NuxtLink>
      <div class="hero__progress-bar">
        <div class="hero__track" role="progressbar" :aria-valuenow="reviewedToday" :aria-valuemax="totalDue">
          <div class="hero__fill" :style="{ width: progressPercent + '%' }" />
        </div>
        <span class="hero__count">{{ reviewedToday }}/{{ totalDue }}</span>
      </div>
    </div>
  </section>

  <!-- Hero: novo usuário (0 cards) -->
  <section v-else-if="totalUserCards === 0" class="hero">
    <div class="hero__row hero__row--greeting">
      <img src="~/assets/mascot-baigi-reading.png" alt="" class="hero__mascot" />
      <span class="hero__greeting-text">Hora de começar.</span>
    </div>
    <div class="hero__row hero__row--metric">
      <div class="hero__metric">
        <h1 class="hero__number hero__number--sm">Crie seus primeiros cards.</h1>
        <p class="hero__context">Importe um PDF ou crie um caderno pra começar.</p>
      </div>
    </div>
    <div class="hero__row hero__row--actions">
      <NuxtLink to="/cadernos" class="hero__cta">Criar caderno</NuxtLink>
      <NuxtLink to="/importar" class="btn-secondary">Importar Anki</NuxtLink>
    </div>
  </section>

  <!-- Hero: tudo em dia -->
  <section v-else class="hero">
    <div class="hero__row hero__row--greeting">
      <img src="~/assets/mascot-baigi-celebrating.png" alt="" class="hero__mascot" />
      <span class="hero__greeting-text">{{ greeting }}, {{ firstName }}.</span>
    </div>
    <div class="hero__row hero__row--metric">
      <div class="hero__metric">
        <h1 class="hero__number hero__number--sm">Tudo em dia! 🎉</h1>
        <p class="hero__context">{{ subtitle }}</p>
      </div>
    </div>
    <div class="hero__row hero__row--actions">
      <NuxtLink to="/cadernos" class="btn-secondary">Ir pra Cadernos</NuxtLink>
    </div>
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
/* Hero uses full container width — no sub-max-width */
.hero {
  padding: 24px 0 0;
}

/* Rows — structure the vertical rhythm */
.hero__row {
  display: flex;
  align-items: center;
}
.hero__row--greeting {
  gap: 10px;
  margin-bottom: 20px;
}
.hero__row--metric {
  margin-bottom: 0;
}
.hero__row--actions {
  gap: 24px;
  margin-top: 24px;
}
@media (max-width: 639px) {
  .hero__row--actions {
    flex-direction: column;
    align-items: stretch;
    gap: 14px;
  }
}

/* Greeting */
.hero__mascot {
  width: 32px;
  height: 32px;
  object-fit: contain;
  border-radius: 6px;
}
.hero__greeting-text {
  font-size: 16px;
  font-weight: 500;
  color: var(--color-text-secondary);
}

/* Metric block */
.hero__metric {
  display: flex;
  flex-direction: column;
}
.hero__label {
  font-size: 15px;
  font-weight: 400;
  color: var(--color-text-secondary);
  margin-bottom: 4px;
}
.hero__number {
  font-size: 3.5rem;
  font-weight: 720;
  line-height: 1;
  color: var(--color-text-primary);
  letter-spacing: -0.035em;
}
.hero__number--sm {
  font-size: 2.25rem;
}
@media (min-width: 640px) {
  .hero__number {
    font-size: 4rem;
  }
}
.hero__context {
  font-size: 14px;
  font-weight: 400;
  color: var(--color-text-muted);
  margin-top: 8px;
}
.hero__exam-badge {
  display: inline-flex;
  align-items: center;
  font-size: 11px;
  font-weight: 500;
  color: var(--color-warning);
  padding: 2px 8px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--color-warning) 6%, transparent);
  margin-bottom: 6px;
}

/* CTA */
.hero__cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 46px;
  padding: 0 28px;
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  background: var(--color-primary-500, var(--color-accent-primary));
  border-radius: 11px;
  transition: all 180ms ease-out;
  box-shadow: 0 1px 3px rgba(111, 63, 245, 0.06), 0 4px 14px rgba(111, 63, 245, 0.10);
  white-space: nowrap;
  flex-shrink: 0;
}
.hero__cta:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(111, 63, 245, 0.08), 0 8px 24px rgba(111, 63, 245, 0.14);
  background: var(--color-primary-600, var(--color-accent-primary));
}

/* Progress bar — fixed width, same line as CTA */
.hero__progress-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 220px;
}
@media (max-width: 639px) {
  .hero__progress-bar {
    width: 100%;
  }
}
.hero__track {
  flex: 1;
  height: 4px;
  border-radius: 99px;
  background: color-mix(in srgb, var(--color-primary-500) 6%, var(--bg-soft));
  overflow: hidden;
}
.hero__fill {
  height: 100%;
  border-radius: 99px;
  background: var(--color-primary-500, var(--color-accent-primary));
  opacity: 0.75;
  transition: width 600ms cubic-bezier(0.4, 0, 0.2, 1);
}
.hero__count {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
  font-variant-numeric: tabular-nums;
  font-family: 'Geist', ui-monospace, monospace;
  flex-shrink: 0;
}
</style>
