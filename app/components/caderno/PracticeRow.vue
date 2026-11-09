<template>
  <UiSection title="Praticar" :level="2" data-testid="scope-practice">
    <ul class="-mx-3 grid gap-x-2 sm:grid-cols-2">
      <li v-for="item in items" :key="item.key">
        <UiListRow :to="item.to" :title="item.label" :meta="item.meta" :data-testid="`practice-${item.key}`">
          <template #leading>
            <UiPracticeIcon v-if="item.mode" :mode="item.mode" size="sm" />
            <span v-else class="flex size-7.5 items-center justify-center rounded-row bg-soft text-fg-muted" aria-hidden="true">
              <component :is="item.icon" class="size-3.5" />
            </span>
          </template>
        </UiListRow>
      </li>
    </ul>
  </UiSection>
</template>

<script setup lang="ts">
// Praticar of the scope (prd-4b-caderno-v3 RF-F7): four shortcuts always visible, each saying what is
// missing instead of disappearing (estudo §5.1). Questões (or the timed quiz in the exam mode, where
// Questões already sits in the header), Ouvir (episodes of the scope), the map and the card library. In
// the language mode a loose card takes the place of the map (D11). Gates come from the summary.
import type { Component } from 'vue'
import { Layers, Network, PenLine } from 'lucide-vue-next'
import type { PracticeMode } from '~/components/ui/PracticeIcon.vue'
import type { ScopeSummary } from '~/types'
import { requirementText } from '~/utils/studyRequirement'

const props = defineProps<{ summary: ScopeSummary }>()

const fmt = (n: number) => n.toLocaleString('pt-BR')

const items = computed(() => {
  const s = props.summary
  const id = s.topic.id
  const mode = s.topic.learning_mode
  const isRoot = s.topic.depth === 0
  const out: { key: string; label: string; meta: string; to: string; mode?: PracticeMode; icon?: Component }[] = []
  out.push({
    key: 'quiz',
    label: mode === 'exam' ? 'Simulado cronometrado' : 'Questões',
    meta: requirementText(s.can_quiz) ?? (s.questions?.answered ? `${fmt(s.questions.answered)} respondidas` : 'do que você estudou aqui'),
    to: `/simulados?topic_id=${id}`,
    mode: 'quiz',
  })
  out.push({
    key: 'listen',
    label: 'Ouvir',
    meta: requirementText(s.can_podcast) ?? (s.listen ? 'episódios deste caderno' : 'gere um episódio'),
    to: `/podcasts?topic_id=${id}`,
    mode: 'listen',
  })
  if (mode === 'language') {
    out.push({ key: 'card', label: 'Criar card avulso', meta: 'frente e verso, à mão', to: `${cadernoPath(id, { view: 'cards' })}?new=1`, icon: PenLine })
  } else {
    out.push({ key: 'map', label: isRoot ? 'Mapa do caderno' : 'Mapa da matéria', meta: 'materiais por assunto', to: cadernoPath(id, { view: 'mapa' }), icon: Network })
  }
  out.push({ key: 'cards', label: `Todos os cards (${fmt(s.counts.cards)})`, meta: 'buscar, editar e criar', to: cadernoPath(id, { view: 'cards' }), icon: Layers })
  return out
})
</script>
