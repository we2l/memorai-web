<template>
  <!-- Hero: cards pendentes -->
  <section v-if="totalCards > 0" class="hero">
    <div class="hero__left">
      <div class="hero__meta">
        <img src="~/assets/mascot-baigi-bust.png" alt="" class="hero__mascot" />
        <span class="hero__salute">{{ greeting }}, {{ firstName }}.</span>
      </div>
      <p class="hero__lead">Hoje faltam apenas</p>
      <h1 class="hero__headline">{{ totalCards }}<span class="hero__unit"> cards.</span></h1>
    </div>

    <div class="hero__right">
      <p v-if="nextExam" class="hero__badge">📋 Prova em {{ nextExam.days_remaining }} dias</p>
      <p class="hero__session">{{ mainTopicName }} · ≈{{ estimatedMinutes }} min</p>
      <NuxtLink to="/revisar" class="hero__cta">Começar revisão</NuxtLink>
      <div class="hero__progress">
        <div class="hero__bar" role="progressbar" :aria-valuenow="reviewedToday" :aria-valuemax="totalDue">
          <div class="hero__bar-fill" :style="{ width: progressPercent + '%' }" />
        </div>
        <span class="hero__bar-label">{{ reviewedToday }}/{{ totalDue }}</span>
      </div>
    </div>
  </section>

  <!-- Hero: novo usuário (0 cards) -->
  <section v-else-if="totalUserCards === 0" class="hero">
    <div class="hero__left">
      <div class="hero__meta">
        <img src="~/assets/mascot-baigi-reading.png" alt="" class="hero__mascot" />
        <span class="hero__salute">{{ greeting }}, {{ firstName }}.</span>
      </div>
      <h1 class="hero__headline hero__headline--sm">Crie seus<span class="hero__unit"> primeiros cards.</span></h1>
    </div>
    <div class="hero__right">
      <p class="hero__session">Importe um PDF ou crie um caderno pra começar.</p>
      <NuxtLink to="/cadernos" class="hero__cta">Criar caderno</NuxtLink>
      <NuxtLink to="/importar" class="hero__secondary">Importar Anki →</NuxtLink>
    </div>
  </section>

  <!-- Hero: tudo em dia -->
  <section v-else class="hero">
    <div class="hero__left">
      <div class="hero__meta">
        <img src="~/assets/mascot-baigi-celebrating.png" alt="" class="hero__mascot" />
        <span class="hero__salute">{{ greeting }}, {{ firstName }}.</span>
      </div>
      <h1 class="hero__headline hero__headline--sm">Tudo em dia! 🎉</h1>
    </div>
    <div class="hero__right">
      <p class="hero__session">{{ subtitle }}</p>
      <NuxtLink to="/cadernos" class="hero__cta hero__cta--secondary">Ir pra Cadernos</NuxtLink>
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
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
  padding: 20px 0 0;
  align-items: end;
}
@media (min-width: 768px) {
  .hero {
    grid-template-columns: 1fr auto;
    gap: 48px;
    padding: 28px 0 0;
  }
}

/* LEFT — metric and identity */
.hero__left {
  min-width: 0;
}

.hero__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
.hero__mascot {
  width: 28px;
  height: 28px;
  object-fit: contain;
  border-radius: 6px;
}
.hero__salute {
  font-size: 14px;
  font-weight: 400;
  color: var(--color-text-muted);
}

.hero__lead {
  font-size: 14px;
  font-weight: 400;
  color: var(--color-text-secondary);
  margin-bottom: 2px;
}

.hero__headline {
  font-size: 4rem;
  font-weight: 750;
  line-height: 0.92;
  color: var(--color-text-primary);
  letter-spacing: -0.04em;
  white-space: nowrap;
}
.hero__headline--sm {
  font-size: 2.5rem;
  letter-spacing: -0.025em;
  line-height: 1;
}
@media (min-width: 768px) {
  .hero__headline {
    font-size: 4.5rem;
  }
}
.hero__unit {
  font-weight: 500;
  opacity: 0.55;
}

/* RIGHT — session info + action */
.hero__right {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
}
@media (min-width: 768px) {
  .hero__right {
    align-items: flex-end;
    text-align: right;
    padding-bottom: 4px;
  }
}

.hero__badge {
  font-size: 11px;
  font-weight: 500;
  color: var(--color-warning);
  padding: 2px 8px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--color-warning) 6%, transparent);
}

.hero__session {
  font-size: 14px;
  font-weight: 400;
  color: var(--color-text-secondary);
}

.hero__cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 44px;
  padding: 0 26px;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  background: var(--color-primary-500, var(--color-accent-primary));
  border-radius: 10px;
  transition: all 180ms ease-out;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04), 0 4px 14px rgba(111, 63, 245, 0.10);
  white-space: nowrap;
  margin-top: 2px;
}
.hero__cta:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06), 0 8px 24px rgba(111, 63, 245, 0.14);
  background: var(--color-primary-600, var(--color-accent-primary));
}
.hero__cta--secondary {
  background: transparent;
  color: var(--color-primary-500, var(--color-accent-primary));
  border: 1px solid color-mix(in srgb, var(--color-primary-500) 20%, var(--border-base));
  box-shadow: none;
}
.hero__cta--secondary:hover {
  background: color-mix(in srgb, var(--color-primary-500) 4%, transparent);
  transform: none;
  box-shadow: none;
}

.hero__secondary {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-primary-500, var(--color-accent-primary));
  transition: opacity 150ms;
}
.hero__secondary:hover {
  opacity: 0.7;
}

/* Progress */
.hero__progress {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 180px;
}
@media (max-width: 767px) {
  .hero__progress {
    width: 160px;
  }
}
.hero__bar {
  flex: 1;
  height: 3px;
  border-radius: 99px;
  background: color-mix(in srgb, var(--color-primary-500) 8%, var(--bg-soft));
  overflow: hidden;
}
.hero__bar-fill {
  height: 100%;
  border-radius: 99px;
  background: var(--color-primary-500, var(--color-accent-primary));
  opacity: 0.7;
  transition: width 600ms cubic-bezier(0.4, 0, 0.2, 1);
}
.hero__bar-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
  font-family: 'Geist', ui-monospace, monospace;
  flex-shrink: 0;
}
</style>
