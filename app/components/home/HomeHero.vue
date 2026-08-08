<template>
  <!-- Hero: cards pendentes -->
  <section v-if="totalCards > 0" class="hero-card">
    <div class="hero-card__greeting">
      <img src="~/assets/mascot-baigi-bust.png" alt="" class="hero-card__mascot" />
      <span class="hero-card__salute">{{ greeting }}, {{ firstName }}.</span>
    </div>

    <div class="hero-card__headline">
      <p v-if="nextExam" class="hero-card__badge">📋 Prova em {{ nextExam.days_remaining }} dias</p>
      <p class="hero-card__lead">Hoje faltam apenas</p>
      <h1 class="hero-card__number"><span class="hero-card__value">{{ totalCards }}</span> cards.</h1>
      <p class="hero-card__info">{{ mainTopicName }} · ≈{{ estimatedMinutes }} min</p>
    </div>

    <div class="hero-card__action">
      <NuxtLink to="/revisar" class="hero-card__cta">Começar revisão</NuxtLink>
      <div class="hero-card__progress">
        <div class="hero-card__track" role="progressbar" :aria-valuenow="reviewedToday" :aria-valuemax="totalDue">
          <div class="hero-card__fill" :style="{ width: progressPercent + '%' }" />
        </div>
        <span class="hero-card__count">{{ reviewedToday }}/{{ totalDue }}</span>
      </div>
    </div>
  </section>

  <!-- Hero: novo usuário (0 cards) -->
  <section v-else-if="totalUserCards === 0" class="hero-card">
    <div class="hero-card__greeting">
      <img src="~/assets/mascot-baigi-reading.png" alt="" class="hero-card__mascot" />
      <span class="hero-card__salute">{{ greeting }}, {{ firstName }}.</span>
    </div>
    <div class="hero-card__headline">
      <h1 class="hero-card__number hero-card__number--sm">Crie seus primeiros cards.</h1>
      <p class="hero-card__info">Importe um PDF ou crie um caderno pra começar.</p>
    </div>
    <div class="hero-card__action">
      <NuxtLink to="/cadernos" class="hero-card__cta">Criar caderno</NuxtLink>
      <NuxtLink to="/importar" class="hero-card__link">Importar Anki →</NuxtLink>
    </div>
  </section>

  <!-- Hero: tudo em dia -->
  <section v-else class="hero-card">
    <div class="hero-card__greeting">
      <img src="~/assets/mascot-baigi-celebrating.png" alt="" class="hero-card__mascot" />
      <span class="hero-card__salute">{{ greeting }}, {{ firstName }}.</span>
    </div>
    <div class="hero-card__headline">
      <h1 class="hero-card__number hero-card__number--sm">Tudo em dia! 🎉</h1>
      <p class="hero-card__info">{{ subtitle }}</p>
    </div>
    <div class="hero-card__action">
      <NuxtLink to="/cadernos" class="hero-card__cta hero-card__cta--outline">Ir pra Cadernos</NuxtLink>
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
.hero-card {
  background: color-mix(in srgb, var(--color-primary-500) 1.5%, var(--bg-card));
  border: 1px solid color-mix(in srgb, var(--color-primary-500) 5%, var(--border-base));
  border-radius: 18px;
  padding: 30px 32px 28px;
}

/* Greeting */
.hero-card__greeting {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 22px;
}
.hero-card__mascot {
  width: 30px;
  height: 30px;
  object-fit: contain;
  border-radius: 6px;
}
.hero-card__salute {
  font-size: 15px;
  font-weight: 450;
  color: var(--color-text-muted);
}

/* Headline block */
.hero-card__headline {
  margin-bottom: 22px;
}
.hero-card__lead {
  font-size: 14px;
  font-weight: 400;
  color: var(--color-text-secondary);
  margin-bottom: 4px;
}
.hero-card__number {
  font-size: 3.5rem;
  font-weight: 730;
  line-height: 0.95;
  color: var(--color-text-primary);
  letter-spacing: -0.035em;
}
.hero-card__number--sm {
  font-size: 2rem;
  letter-spacing: -0.02em;
  line-height: 1.1;
}
@media (min-width: 640px) {
  .hero-card__number {
    font-size: 4rem;
  }
}
.hero-card__value {
  color: var(--color-primary-500, var(--color-accent-primary));
}
.hero-card__info {
  font-size: 14px;
  font-weight: 400;
  color: var(--color-text-muted);
  margin-top: 10px;
}

.hero-card__badge {
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

/* Action row */
.hero-card__action {
  display: flex;
  align-items: center;
  gap: 24px;
}
@media (max-width: 639px) {
  .hero-card__action {
    flex-direction: column;
    align-items: stretch;
    gap: 14px;
  }
}

.hero-card__cta {
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
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04), 0 4px 14px rgba(111, 63, 245, 0.10);
  white-space: nowrap;
  flex-shrink: 0;
}
.hero-card__cta:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06), 0 8px 20px rgba(111, 63, 245, 0.14);
  background: var(--color-primary-600, var(--color-accent-primary));
}
.hero-card__cta--outline {
  background: transparent;
  color: var(--color-primary-500, var(--color-accent-primary));
  border: 1px solid color-mix(in srgb, var(--color-primary-500) 20%, var(--border-base));
  box-shadow: none;
}
.hero-card__cta--outline:hover {
  background: color-mix(in srgb, var(--color-primary-500) 4%, transparent);
  transform: none;
  box-shadow: none;
}

.hero-card__link {
  font-size: 13.5px;
  font-weight: 500;
  color: var(--color-primary-500, var(--color-accent-primary));
  transition: opacity 150ms;
}
.hero-card__link:hover {
  opacity: 0.7;
}

/* Progress */
.hero-card__progress {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 200px;
}
@media (max-width: 639px) {
  .hero-card__progress {
    width: 100%;
  }
}
.hero-card__track {
  flex: 1;
  height: 4px;
  border-radius: 99px;
  background: color-mix(in srgb, var(--color-primary-500) 7%, var(--bg-soft));
  overflow: hidden;
}
.hero-card__fill {
  height: 100%;
  border-radius: 99px;
  background: var(--color-primary-500, var(--color-accent-primary));
  opacity: 0.7;
  transition: width 600ms cubic-bezier(0.4, 0, 0.2, 1);
}
.hero-card__count {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
  font-family: 'Geist', ui-monospace, monospace;
  flex-shrink: 0;
}
</style>
