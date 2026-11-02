<template>
  <UiSection v-if="!allDone" as="div">
    <p class="text-label mb-3">Primeiros passos</p>
    <div class="space-y-0.5">
      <!-- Pending steps lead to the action (RF-F4); done ones are plain text -->
      <component
        :is="item.done ? 'div' : NuxtLink"
        v-for="item in items"
        :key="item.key"
        :to="item.done ? undefined : item.to"
        class="flex items-center gap-2.5 min-h-touch -mx-2 px-2 rounded-control"
        :class="{ 'hover:bg-subtle transition-colors': !item.done }"
      >
        <span
          class="w-5 h-5 rounded-full flex items-center justify-center text-label shrink-0"
          :class="item.done ? 'bg-action text-on-action' : 'border-2 border-line-strong'"
        >
          <span v-if="item.done">✓</span>
        </span>
        <span class="text-meta flex-1" :class="item.done ? 'text-fg-muted line-through' : 'text-fg-strong'">
          {{ item.label }}
        </span>
        <ChevronRight v-if="!item.done" :size="16" class="text-fg-muted shrink-0" aria-hidden="true" />
      </component>
    </div>
    <p class="text-label text-fg-muted mt-3">{{ doneCount }}/{{ items.length }} concluídos</p>
  </UiSection>
</template>

<script setup lang="ts">
import { ChevronRight } from 'lucide-vue-next'

const props = defineProps<{
  hasTopics: boolean
  hasMaterial: boolean
  hasCards: boolean
  hasReviewed: boolean
  streak: number
  /** First caderno: material and cards open it. Without one, /cadernos offers to create it. */
  topicId?: string | null
}>()

const NuxtLink = resolveComponent('NuxtLink')

const notebook = (tab?: string) => (props.topicId ? `/cadernos?topic=${props.topicId}${tab ? `&tab=${tab}` : ''}` : '/cadernos')

const items = computed(() => [
  { key: 'topic', label: 'Criar um caderno', done: props.hasTopics, to: '/cadernos' },
  { key: 'material', label: 'Adicionar material (nota ou PDF)', done: props.hasMaterial, to: notebook() },
  { key: 'cards', label: 'Gerar ou criar cards', done: props.hasCards, to: notebook('cards') },
  { key: 'review', label: 'Fazer primeira revisão', done: props.hasReviewed, to: '/revisar' },
  { key: 'streak', label: 'Estudar 3 dias seguidos', done: props.streak >= 3, to: '/revisar' },
])

const doneCount = computed(() => items.value.filter(i => i.done).length)
const allDone = computed(() => doneCount.value === items.value.length)
</script>
