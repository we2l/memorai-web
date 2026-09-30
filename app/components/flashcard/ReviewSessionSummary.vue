<template>
  <section class="w-full max-w-lg mx-auto text-center" aria-labelledby="session-summary-title">
    <picture class="contents"><source srcset="~/assets/mascots/mascot-baigi-celebrating.avif" type="image/avif"><img src="~/assets/mascots/mascot-baigi-celebrating.webp" alt="" class="w-24 h-24 object-contain mx-auto" width="96" height="96" loading="lazy" decoding="async" /></picture>
    <h2 id="session-summary-title" class="text-display mt-4">Missão de hoje concluída!</h2>

    <dl class="grid grid-cols-1 min-[420px]:grid-cols-3 gap-3 mt-6">
      <div class="card py-4">
        <dt class="text-micro text-base-muted">Revisados</dt>
        <dd class="text-2xl font-bold text-base-primary">{{ reviewed }}</dd>
      </div>
      <div class="card py-4">
        <dt class="text-micro text-base-muted">Lembrados</dt>
        <dd class="text-2xl font-bold text-base-primary">{{ rememberedPct }}%</dd>
      </div>
      <div class="card py-4">
        <dt class="text-micro text-base-muted">Tempo</dt>
        <dd class="text-2xl font-bold text-base-primary font-mono">{{ duration }}</dd>
      </div>
    </dl>

    <p v-if="pendingLearning > 0" class="text-base-muted text-small mt-4">
      {{ pendingLearning }} card{{ pendingLearning !== 1 ? 's' : '' }} em aprendizado — {{ pendingLearning === 1 ? 'volta' : 'voltam' }} em breve.
    </p>

    <!-- Filled by prd-retencao-lembretes ("Amanhã: N cards + streak"), above the suggestion (RF-F05) -->
    <slot name="tomorrow" />

    <!-- Post-session suggestion -->
    <div v-if="topErrorTopic" class="mt-6 card border border-[var(--badge-warning-text)]/30">
      <p class="text-small text-base-primary">Você errou {{ topErrorTopic.count }}x em "{{ topErrorTopic.name }}".</p>
      <div class="flex gap-2 mt-3 justify-center">
        <NuxtLink :to="`/revisar?topic_id=${topErrorTopic.id}&errors_only=1&t=${Date.now()}`" class="btn-primary !py-1.5 !px-3 !min-h-[2.75rem] text-small">
          Reforçar
        </NuxtLink>
      </div>
    </div>

    <div class="flex flex-col min-[420px]:flex-row gap-3 justify-center mt-8">
      <NuxtLink to="/hoje" class="btn-primary justify-center">Voltar para Hoje</NuxtLink>
      <NuxtLink v-if="hasBacklog" :to="`/revisar?backlog=1&t=${Date.now()}`" class="btn-secondary justify-center">Revisar mais</NuxtLink>
    </div>
  </section>
</template>

<script setup lang="ts">
const props = defineProps<{
  reviewed: number
  ratings: Record<1 | 2 | 3 | 4, number>
  startedAt: number
  pendingLearning: number
  topErrorTopic: { id: string; name: string; count: number } | null
  hasBacklog?: boolean
}>()

const rememberedPct = computed(() => {
  const total = props.ratings[1] + props.ratings[2] + props.ratings[3] + props.ratings[4]
  if (!total) return 0
  return Math.round(((props.ratings[3] + props.ratings[4]) / total) * 100)
})

// Frozen when the summary mounts
const endedAt = Date.now()
const duration = computed(() => {
  const secs = props.startedAt ? Math.max(0, Math.round((endedAt - props.startedAt) / 1000)) : 0
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`
})
</script>
