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
      <p v-if="nextExam" class="inline-flex items-center text-xs text-warning font-medium px-2 py-0.5 rounded-full bg-warning/10 mb-2">📋 Prova em {{ nextExam.days_remaining }} dias</p>
      <p class="text-sm text-base-secondary">{{ heroSubtitle }}</p>
      <p class="hero__number">{{ totalCards }} cards.</p>
      <p class="text-sm text-base-muted mt-1">≈{{ estimatedMinutes }} min · {{ mainTopicName }}</p>
    </div>

    <div class="hero__actions">
      <NuxtLink to="/revisar" class="hero__cta">Começar revisão</NuxtLink>
      <div class="hero__progress">
        <div class="hero__progress-track" role="progressbar" :aria-valuenow="reviewedToday" :aria-valuemax="totalDue">
          <div class="hero__progress-fill" :style="{ width: progressPercent + '%' }" />
        </div>
        <span class="text-[11px] text-base-muted font-mono shrink-0">{{ reviewedToday }}/{{ totalDue }}</span>
      </div>
    </div>
  </section>

  <!-- Hero: novo usuário (0 cards) -->
  <section v-else-if="totalUserCards === 0" class="hero">
    <div class="flex items-center gap-3">
      <img src="~/assets/mascot-baigi-reading.png" alt="" class="w-12 h-12 object-contain shrink-0" />
      <div>
        <p class="text-xl font-bold text-base-primary">Comece por aqui.</p>
        <p class="text-sm text-base-muted mt-0.5">Importe um PDF ou crie um caderno pra gerar seus cards.</p>
      </div>
    </div>
    <div class="flex gap-3 mt-4">
      <NuxtLink to="/cadernos" class="hero__cta">Criar caderno</NuxtLink>
      <NuxtLink to="/importar" class="btn-secondary">Importar Anki</NuxtLink>
    </div>
  </section>

  <!-- Hero: tudo em dia -->
  <section v-else class="hero">
    <div class="flex items-center gap-3">
      <img src="~/assets/mascot-baigi-celebrating.png" alt="" class="w-10 h-10 object-contain shrink-0" />
      <div>
        <p class="text-xl font-bold text-base-primary">Tudo em dia! 🎉</p>
        <p class="text-sm text-base-muted mt-0.5">{{ subtitle }}</p>
      </div>
    </div>
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

const heroSubtitle = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return 'Vamos manter o ritmo.'
  if (h < 18) return `Faltam só ${totalCards.value} cards.`
  return 'Última chance do dia. Bora?'
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

.hero__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.hero__body {
  margin-top: 16px;
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

/* CTA + Progress on same line */
.hero__actions {
  display: flex;
  align-items: center;
  gap: 24px;
  margin-top: 20px;
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
  padding: 12px 28px;
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  background: var(--color-primary-500, var(--color-accent-primary));
  border-radius: 14px;
  transition: all 150ms ease-out;
  box-shadow: 0 4px 16px rgba(111, 63, 245, 0.25);
  white-space: nowrap;
  shrink: 0;
}
.hero__cta:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(111, 63, 245, 0.3);
  background: var(--color-primary-600, var(--color-accent-primary));
}

.hero__progress {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
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
</style>
