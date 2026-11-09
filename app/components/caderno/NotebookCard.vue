<template>
  <NuxtLink
    :to="cadernoPath(topic.id)"
    class="flex flex-col rounded-card bg-raised p-5 shadow-1 transition-shadow duration-fast hover:shadow-2"
    data-testid="notebook-card"
  >
    <span class="flex items-start gap-3">
      <span class="relative grid size-10 shrink-0 place-items-center rounded-icon bg-soft text-body font-bold text-fg-strong" aria-hidden="true">
        {{ initial }}
        <UiSubjectMark :color="topic.color" class="absolute -right-0.5 -bottom-0.5 ring-2 ring-raised" />
      </span>
      <span class="min-w-0 flex-1">
        <span class="block font-semibold break-words text-fg-strong">{{ topic.name }}</span>
        <span class="block text-meta text-fg-muted">{{ subline }}</span>
      </span>
      <UiTag v-if="topic.is_sample" class="shrink-0" data-testid="sample-tag">Exemplo</UiTag>
    </span>

    <span v-if="topic.flashcards_count > 0" class="mt-5 flex items-end gap-4">
      <span class="shrink-0">
        <UiNumber :value="`${percent}%`" size="s" />
        <span class="mt-1 block text-meta text-fg-muted">de domínio</span>
      </span>
      <UiProgressBar class="mb-2 flex-1" :value="percent" :label="`Domínio de ${topic.name}: ${percent}%`" />
    </span>
    <span v-else class="mt-5 block text-meta text-fg-muted">Sem cards ainda: o primeiro passo é gerar os cards do material.</span>

    <span class="mt-auto flex items-center justify-between gap-3 border-t border-hairline pt-3.5 text-meta text-fg-muted" :class="topic.flashcards_count > 0 ? 'mt-5' : 'mt-4'">
      <span data-testid="notebook-meta">{{ meta }}</span>
      <UiTag v-if="topic.session_count > 0" tone="action" class="tabular-nums">{{ topic.session_count }} hoje</UiTag>
      <UiTag v-else>{{ topic.flashcards_count > 0 ? 'em dia' : 'novo' }}</UiTag>
    </span>
  </NuxtLink>
</template>

<script setup lang="ts">
// One caderno on /cadernos, E2 (prd-visual-e2 RF-4.1): a card of the grid with the initial and the dot of its color, the
// name, the mastery in the Fraunces with its bar, what it holds and "N hoje" (the session of the whole subtree, the
// same number as its "Revisar hoje"). The whole card is the link.
import type { TopicProgress } from '~/types'

const props = defineProps<{ topic: TopicProgress }>()

const percent = computed(() => Math.round((props.topic.progress ?? 0) * 100))
const initial = computed(() => props.topic.name.trim().charAt(0).toUpperCase() || '·')
const subline = computed(() => (props.topic.is_sample ? 'Caderno de exemplo' : props.topic.flashcards_count > 0 ? 'Caderno' : 'Novo caderno'))
const meta = computed(() => {
  const t = props.topic
  const parts: string[] = []
  if (t.notes_count) parts.push(plural(t.notes_count, 'material', 'materiais'))
  parts.push(plural(t.flashcards_count, 'card', 'cards'))
  return parts.join(' · ')
})
</script>

