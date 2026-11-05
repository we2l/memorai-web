<template>
  <UiListRow :to="cadernoPath(topic.id)">
    <template #title>{{ topic.name }} <UiTag v-if="topic.is_sample" class="ml-1 align-middle" data-testid="sample-tag">Exemplo</UiTag></template>
    <template #leading>
      <UiSubjectMark :color="topic.color" />
    </template>
    <template #trailing>
      <span v-if="topic.session_count > 0" class="whitespace-nowrap">
        <span class="font-semibold tabular-nums text-fg-strong">{{ topic.session_count }}</span> hoje
      </span>
      <span v-else class="whitespace-nowrap">{{ topic.flashcards_count > 0 ? 'em dia' : 'novo' }}</span>
      <UiProgressBar class="w-20" :value="percent" :label="`Domínio de ${topic.name}: ${percent}%`" />
    </template>
  </UiListRow>
</template>

<script setup lang="ts">
// One caderno in a list (Hoje and /cadernos, prd-4b-caderno-v3 RF-F2): the dot of its color, the name, "N hoje"
// (the session of the whole subtree, the same number as its "Revisar hoje") and the mastery bar in purple.
import type { TopicProgress } from '~/types'

const props = defineProps<{ topic: Pick<TopicProgress, 'id' | 'name' | 'color' | 'session_count' | 'flashcards_count' | 'progress' | 'is_sample'> }>()

const percent = computed(() => Math.round((props.topic.progress ?? 0) * 100))
</script>
