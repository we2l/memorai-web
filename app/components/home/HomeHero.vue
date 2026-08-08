<template>
  <!-- Hero: cards pendentes -->
  <section v-if="totalCards > 0" class="hero">
    <div class="hero__greeting">
      <img src="~/assets/mascot-baigi-bust.png" alt="" class="hero__mascot" />
      <span class="hero__greeting-text">{{ greeting }}, {{ firstName }}.</span>
      <span v-if="streak > 1" class="hero__streak">🔥 {{ streak }}</span>
    </div>

    <div class="hero__focus">
      <p v-if="nextExam" class="hero__exam-badge">📋 Prova em {{ nextExam.days_remaining }} dias</p>
      <p class="hero__label">Hoje faltam apenas</p>
      <h1 class="hero__number">{{ totalCards }} cards.</h1>
      <p class="hero__context">≈{{ estimatedMinutes }} min · {{ mainTopicName }}</p>
    </div>

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
      <img src="~/assets/mascot-baigi-reading.png" alt="" class="hero__mascot hero__mascot--lg" />
      <div>
        <h1 class="hero__number" style="font-size: 1.75rem">Crie seus primeiros cards.</h1>
        <p class="hero__context">Importe um PDF ou crie um caderno pra começar.</p>
      </div>
    </div>
    <div class="hero__actions">
      <NuxtLink to="/cadernos" class="hero__cta">Criar caderno</NuxtLink>
      <NuxtLink to="/importar" class="btn-secondary">Importar Anki</NuxtLink>
    </div>
  </section>

  <!-- Hero: tudo em dia -->
  <section v-else class="hero">
    <div class="hero__greeting">
      <img src="~/assets/mascot-baigi-celebrating.png" alt="" class="hero__mascot hero__mascot--lg" />
      <span class="hero__greeting-text">{{ greeting }}, {{ firstName }}.</span>
    </div>
    <div class="hero__focus">
      <h1 class="hero__number" style="font-size: 1.75rem">Tudo em dia! 🎉</h1>
      <p class="hero__context">{{ subtitle }}</p>
    </div>
    <NuxtLink to="/cadernos" class="btn-secondary inline-flex mt-3">Ir pra Cadernos</NuxtLink>
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
  padding: 0;
}

/* Greeting */
.hero__greeting {
  display: flex;
  align-items: center;
  gap: 9px;
}
.hero__mascot {
  width: 24px;
  height: 24px;
  object-fit: contain;
  border-radius: 5px;
}
.hero__mascot--lg {
  width: 30px;
  height: 30px;
}
.hero__greeting-text {
  font-size: 14px;
  font-weight: 400;
  color: var(--color-text-muted);
}
.hero__streak {
  font-size: 11px;
  color: var(--color-text-muted);
  opacity: 0.6;
}

/* Focus */
.hero__focus {
  margin-top: 16px;
}
.hero__label {
  font-size: 14px;
  font-weight: 400;
  color: var(--color-text-secondary);
  margin-bottom: 2px;
}
.hero__number {
  font-size: 2.75rem;
  font-weight: 700;
  line-height: 1.05;
  color: var(--color-text-primary);
  letter-spacing: -0.03em;
}
@media (min-width: 640px) {
  .hero__number { font-size: 3.25rem; }
}
.hero__context {
  font-size: 13px;
  font-weight: 400;
  color: var(--color-text-muted);
  margin-top: 6px;
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

/* Actions: CTA + progress as one unit */
.hero__actions {
  display: flex;
  align-items: center;
  gap: 24px;
  margin-top: 22px;
}
@media (max-width: 639px) {
  .hero__actions {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
}

.hero__cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 11px 28px;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  background: var(--color-primary-500, var(--color-accent-primary));
  border-radius: 10px;
  transition: all 180ms ease-out;
  box-shadow: 0 1px 3px rgba(111, 63, 245, 0.06), 0 4px 14px rgba(111, 63, 245, 0.10);
  white-space: nowrap;
  flex-shrink: 0;
}
.hero__cta:hover {
  transform: translateY(-0.5px);
  box-shadow: 0 1px 3px rgba(111, 63, 245, 0.06), 0 6px 20px rgba(111, 63, 245, 0.14);
  background: var(--color-primary-600, var(--color-accent-primary));
}

.hero__progress {
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: 200px;
  flex: 1;
  min-width: 0;
}
.hero__progress-track {
  flex: 1;
  height: 3px;
  border-radius: 99px;
  background: color-mix(in srgb, var(--border-base) 50%, transparent);
  overflow: hidden;
}
.hero__progress-fill {
  height: 100%;
  border-radius: 99px;
  background: var(--color-primary-500, var(--color-accent-primary));
  opacity: 0.7;
  transition: width 600ms cubic-bezier(0.4, 0, 0.2, 1);
}
.hero__progress-label {
  font-size: 12px;
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
  font-family: 'Geist', ui-monospace, monospace;
  flex-shrink: 0;
  opacity: 0.6;
}
</style>
