<template>
  <div class="flex flex-col gap-4">
    <UiSection v-if="review.hintsLoading || review.hints.length" title="Dicas da sua nota" :level="2" aria-live="polite">
      <UiSkeleton v-if="review.hintsLoading" variant="text" :lines="2" />
      <template v-else>
        <ul class="divide-y divide-hairline">
          <li v-for="(hint, i) in visibleHints" :key="i" class="flex gap-2 py-2.5 text-meta text-fg">
            <component :is="styleOf(hint.type).icon" class="mt-0.5 size-4 shrink-0" :class="styleOf(hint.type).tone" aria-hidden="true" />
            <span><span class="font-semibold text-fg-strong">{{ styleOf(hint.type).label }}: </span><span v-html="sanitize(hint.text)" /></span>
          </li>
        </ul>
        <UiButton v-if="!showAll && review.hints.length > 2" size="sm" variant="ghost" @click="showAll = true">Ver mais {{ review.hints.length - 2 }}</UiButton>
      </template>
    </UiSection>

    <UiSection v-if="review.weakSuggestion?.length" title="Caderno conectado também está fraco" :level="2">
      <ul class="divide-y divide-hairline">
        <li v-for="w in review.weakSuggestion" :key="w.id" class="flex items-center justify-between gap-2 py-2 text-meta">
          <span class="font-medium text-fg-strong">{{ w.name }}</span>
          <span class="text-fg-muted">{{ Math.round(w.progress * 100) }}% de domínio</span>
        </li>
      </ul>
    </UiSection>
  </div>
</template>

<script setup lang="ts">
// Optional context after a rating (RF-F2.9): the hints of the card's note after an error and a connected
// caderno that is weak too. Never blocks the session; loaded only when there is something to show.
import { AlertTriangle, Lightbulb, XCircle } from 'lucide-vue-next'

const review = useReviewStore()
const { sanitize } = useSanitize()
const showAll = ref(false)

const visibleHints = computed(() => (showAll.value ? review.hints : review.hints.slice(0, 2)))
watch(() => review.currentCard?.id, () => { showAll.value = false })

function styleOf(type: string) {
  if (type === 'error') return { icon: XCircle, label: 'Erro comum', tone: 'text-danger' }
  if (type === 'gotcha') return { icon: AlertTriangle, label: 'Pegadinha', tone: 'text-warning' }
  return { icon: Lightbulb, label: 'Dica', tone: 'text-info' }
}
</script>
