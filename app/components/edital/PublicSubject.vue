<template>
  <li class="edital-subject">
    <h3>
      <button
        type="button"
        class="flex min-h-touch w-full items-center justify-between gap-3 py-3 text-left"
        :aria-expanded="open"
        :aria-controls="listId"
        data-testid="edital-subject-toggle"
        @click="emit('toggle')"
      >
        <span class="min-w-0 break-words text-title font-semibold text-fg-strong">{{ subject.name }}</span>
        <span class="flex shrink-0 items-center gap-2 text-meta tabular-nums text-fg-muted">
          <span :aria-label="`${studied} de ${subject.topics.length} estudados`">{{ studied }} de {{ subject.topics.length }}</span>
          <ChevronDown class="edital-noprint size-4 transition-transform duration-fast" :class="open && 'rotate-180'" aria-hidden="true" />
        </span>
      </button>
    </h3>
    <!-- Closed on the screen, open on paper (the printed sheet has every assunto) -->
    <ul :id="listId" class="pb-2" :class="!open && 'edital-closed'">
      <li v-for="(topic, ti) in subject.topics" :key="ti">
        <UiCheckbox
          :model-value="checked.has(topicKey(index, ti))"
          :label="topic.name"
          :data-testid="`edital-topic-${index}-${ti}`"
          @update:model-value="emit('check', topicKey(index, ti), $event)"
        />
        <!-- The item as the edital wrote it: always text (the API's string is never HTML) -->
        <details v-if="showsItem(topic)" class="edital-item edital-noprint -mt-1 mb-2">
          <summary class="inline-flex min-h-touch cursor-pointer items-center text-meta text-action-fg underline">ver item do edital</summary>
          <p class="whitespace-pre-line break-words pb-2 text-meta text-fg">{{ topic.description }}</p>
        </details>
      </li>
    </ul>
  </li>
</template>

<script setup lang="ts">
// One matéria of the result (prd-edital-verticalizado-publico RF-F3): collapsible (aria-expanded), "x de n" beside it,
// an assunto per checkbox. Every string comes from a visitor's edital via the API: interpolated, never v-html.
import { ChevronDown } from 'lucide-vue-next'
import type { EditalSubjectDraft, EditalTopicDraft } from '~/types'
import { subjectStudied, topicKey } from '~/utils/publicEdital'

const props = defineProps<{
  subject: EditalSubjectDraft
  index: number
  open: boolean
  checked: ReadonlySet<string>
}>()
const emit = defineEmits<{ (e: 'toggle'): void, (e: 'check', key: string, value: boolean): void }>()

const listId = useId()
const studied = computed(() => subjectStudied(props.subject, props.index, props.checked))

function showsItem(topic: EditalTopicDraft): boolean {
  const d = topic.description?.trim()
  return !!d && d !== topic.name.trim()
}
</script>
