<template>
  <NuxtLink :to="cadernoPath(topic.id)" class="flex min-h-touch items-center gap-3 rounded-row px-2 py-3 transition-colors duration-fast hover:bg-soft">
    <UiSubjectMark :color="topic.color" class="mt-0.5 self-start" />
    <span class="-mt-1 min-w-0 flex-1">
      <span class="block font-semibold break-words text-fg-strong">
        {{ topic.name }} <UiTag v-if="topic.is_sample" class="ml-1 align-middle" data-testid="sample-tag">Exemplo</UiTag>
      </span>
      <span class="block text-meta text-fg-muted" data-testid="notebook-meta">{{ meta }}</span>
    </span>
    <UiTag v-if="topic.flashcards_count === 0" class="shrink-0">novo</UiTag>
    <span v-else class="flex w-24 shrink-0 items-center gap-2.5">
      <UiProgressBar class="flex-1" :value="percent" :label="`Domínio de ${topic.name}: ${percent}%`" />
      <span class="w-8 text-right text-label tabular-nums text-fg-muted" aria-hidden="true">{{ percent }}%</span>
    </span>
  </NuxtLink>
</template>

<script setup lang="ts">
// One caderno in a list (Hoje and /cadernos; E2, prd-visual-e2 RF-3.6): the dot of its color, the name and one line,
// "3 materiais · 45 para hoje" (the session of the whole subtree, the same number as its "Revisar hoje"), or
// "3 materiais · 0 cards" before the first cards ("novo"); the mastery bar in purple with the percent.
import type { TopicProgress } from '~/types'

const props = defineProps<{ topic: Pick<TopicProgress, 'id' | 'name' | 'color' | 'session_count' | 'flashcards_count' | 'progress' | 'is_sample' | 'notes_count'> }>()

const percent = computed(() => Math.round((props.topic.progress ?? 0) * 100))
const meta = computed(() => {
  const t = props.topic
  const parts: string[] = []
  if (t.is_sample) parts.push('Exemplo')
  else if (t.notes_count) parts.push(plural(t.notes_count, 'material', 'materiais'))
  if (t.flashcards_count === 0) parts.push('0 cards')
  else if (t.session_count > 0) parts.push(`${t.session_count} para hoje`)
  else parts.push(t.is_sample ? plural(t.flashcards_count, 'card', 'cards') : 'em dia')
  return parts.join(' · ')
})
</script>
