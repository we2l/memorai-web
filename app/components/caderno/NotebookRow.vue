<template>
  <NuxtLink :to="cadernoPath(topic.id)" class="nb-row flex min-h-touch items-center gap-3 rounded-icon px-3 py-3 transition-colors duration-fast hover:bg-hover">
    <UiNotebookCover :name="topic.name" :color="topic.color" :index="index" class="nb-cover" />
    <span class="min-w-0 flex-1">
      <span class="block font-semibold break-words text-fg-strong">
        {{ topic.name }} <UiTag v-if="topic.is_sample" size="sm" class="ml-1 align-middle" data-testid="sample-tag">Exemplo</UiTag>
      </span>
      <span class="block text-meta text-fg-muted" data-testid="notebook-meta">{{ meta }}</span>
    </span>
    <UiProgressBar v-if="topic.flashcards_count > 0" class="nb-bar shrink-0" :value="percent" :label="`Domínio de ${topic.name}: ${percent}%`" />
    <ChevronRight class="nb-chevron size-4.5 shrink-0 text-fg-muted" aria-hidden="true" />
  </NuxtLink>
</template>

<script setup lang="ts">
// One caderno in a list (Hoje; A2, prd-visual-a2 RF-2.6): the cover with its initials (UiNotebookCover), the name in up
// to 2 lines (never cut), one line "8 para hoje · 39% de domínio" (the session of the whole subtree, the same number as
// its "Revisar hoje"), "começando" before any mastery, the thin bar of 96 px centered on the row and the chevron that
// walks 4 px on hover (not with reduced motion).
import { ChevronRight } from 'lucide-vue-next'
import type { TopicProgress } from '~/types'

const props = defineProps<{
  topic: Pick<TopicProgress, 'id' | 'name' | 'color' | 'session_count' | 'flashcards_count' | 'progress' | 'is_sample' | 'notes_count'>
  /** Position among the cadernos: the cover color of a caderno without one (RN-3) */
  index?: number
}>()

const percent = computed(() => Math.round((props.topic.progress ?? 0) * 100))
const meta = computed(() => {
  const t = props.topic
  if (t.flashcards_count === 0) return t.notes_count ? `${plural(t.notes_count, 'material', 'materiais')} · começando` : 'começando'
  const today = t.session_count > 0 ? `${t.session_count} para hoje` : 'em dia'
  return `${today} · ${percent.value > 0 ? `${percent.value}% de domínio` : 'começando'}`
})
</script>

<style scoped>
/* Phone: the cover of 32 px and a bar of 64; from 640 px, 40 and 96 (RF-1.8, RF-2.6). CSS here, not utilities:
   entry.css has a ceiling */
.nb-cover { width: 2rem; height: 2rem; border-radius: var(--radius-row); }
.nb-bar { width: 4rem; }
@media (min-width: 40rem) {
  .nb-cover { width: 2.5rem; height: 2.5rem; border-radius: var(--radius-icon); }
  .nb-bar { width: 6rem; }
}
/* The chevron walks 4 px under the mouse (RF-1.5); with reduced motion only the color changes */
.nb-chevron { transition: transform var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out); }
@media (hover: hover) {
  .nb-row:hover .nb-chevron { color: var(--action-fg); }
}
@media (hover: hover) and (prefers-reduced-motion: no-preference) {
  .nb-row:hover .nb-chevron { transform: translateX(4px); }
}
</style>
