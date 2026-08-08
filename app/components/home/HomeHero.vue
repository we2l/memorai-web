<template>
  <!-- Hero: cards pendentes -->
  <section v-if="totalCards > 0" class="hero">
    <div class="hero__greeting">
      <img src="~/assets/mascot-baigi-bust.png" alt="" class="hero__mascot" />
      <span class="hero__greeting-text">{{ greeting }}, {{ firstName }}.</span>
    </div>

    <p v-if="nextExam" class="hero__exam-badge">📋 Prova em {{ nextExam.days_remaining }} dias</p>
    <p class="hero__label">Hoje faltam apenas</p>
    <h1 class="hero__number">{{ totalCards }} cards.</h1>
    <p class="hero__context">≈{{ estimatedMinutes }} min · {{ mainTopicName }}</p>

    <div class="hero__actions">
      <NuxtLink to="/revisar" class="hero__cta">Começar revisão</NuxtLink>
      <div class="hero__progress">
        <div class="hero__progress-track" role="progressbar" :aria-valuenow="reviewedToday" :aria-valuemax="totalDue">
          <div class="hero__progress-fill" :style="{ width: progressPercent + '%' }" />
        </div>
        <span class="hero__progress-label">{{ reviewedToday }}/{{ totalDue }}</span>
      </div>
    </div>
  </section>

  <!-- Hero: novo usuário (0 cards) -->
  <section v-else-if="totalUserCards === 0" class="hero">
    <div class="hero__greeting">
      <img src="~/assets/mascot-baigi-reading.png" alt="" class="hero__mascot" />
      <span class="hero__greeting-text">Hora de começar.</span>
    </div>
    <h1 class="hero__number" style="font-size: 2.25rem">Crie seus primeiros cards.</h1>
    <p class="hero__context">Importe um PDF ou crie um caderno pra começar.</p>
    <div class="hero__actions">
      <NuxtLink to="/cadernos" class="hero__cta">Criar caderno</NuxtLink>
      <NuxtLink to="/importar" class="btn-secondary">Importar Anki</NuxtLink>
    </div>
  </section>

  <!-- Hero: tudo em dia -->
  <section v-else class="hero">
    <div class="hero__greeting">
      <img src="~/assets/mascot-baigi-celebrating.png" alt="" class="hero__mascot" />
      <span class="hero__greeting-text">{{ greeting }}, {{ firstName }}.</span>
    </div>
    <h1 class="hero__number" style="font-size: 2.25rem">Tudo em dia! 🎉</h1>
    <p class="hero__context">{{ subtitle }}</p>
    <div class="hero__actions">
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
.hero {
  padding: 28px 0 30px;
  max-width: 680px;
}

/* Greeting */
.hero__greeting {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 22px;
}
.hero__mascot {
  width: 34px;
  height: 34px;
  object-fit: contain;
  border-radius: 7px;
}
.hero__greeting-text {
  font-size: 16px;
  font-weight: 500;
  color: var(--color-text-secondary);
}

/* Label */
.hero__label {
  font-size: 15px;
  font-weight: 500;
  color: var(--color-text-secondary);
  margin-bottom: 3px;
}

/* Number — display metric */
.hero__number {
  font-size: 3.5rem;
  font-weight: 720;
  line-height: 0.95;
  color: var(--color-text-primary);
  letter-spacing: -0.035em;
}
@media (min-width: 640px) {
  .hero__number {
    font-size: 4rem;
  }
}

/* Context */
.hero__context {
  font-size: 14px;
  font-weight: 400;
  color: var(--color-text-muted);
  margin-top: 10px;
}

/* Exam badge */
.hero__exam-badge {
  display: inline-flex;
  align-items: center;
  font-size: 11px;
  font-weight: 500;
  color: var(--color-warning);
  padding: 2px 8px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--color-warning) 6%, transparent);
  margin-bottom: 8px;
}

/* Actions: CTA + progress in one line */
.hero__actions {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-top: 22px;
}
@media (max-width: 639px) {
  .hero__actions {
    flex-direction: column;
    align-items: stretch;
    gap: 14px;
  }
}

.hero__cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 46px;
  padding: 0 28px;
  font-size: 14.5px;
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
  box-shadow: 0 1px 3px rgba(111, 63, 245, 0.06), 0 6px 20px rgba(111, 63, 245, 0.15);
  background: var(--color-primary-600, var(--color-accent-primary));
}

.hero__progress {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 200px;
  flex-shrink: 0;
}
@media (max-width: 639px) {
  .hero__progress {
    width: 100%;
  }
}
.hero__progress-track {
  flex: 1;
  height: 4px;
  border-radius: 99px;
  background: color-mix(in srgb, var(--color-primary-500) 6%, var(--bg-soft));
  overflow: hidden;
}
.hero__progress-fill {
  height: 100%;
  border-radius: 99px;
  background: var(--color-primary-500, var(--color-accent-primary));
  opacity: 0.75;
  transition: width 600ms cubic-bezier(0.4, 0, 0.2, 1);
}
.hero__progress-label {
  font-size: 13px;
  color: var(--color-text-secondary);
  font-variant-numeric: tabular-nums;
  font-family: 'Geist', ui-monospace, monospace;
  flex-shrink: 0;
}
</style>
