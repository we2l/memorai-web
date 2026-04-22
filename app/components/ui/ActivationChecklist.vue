<template>
  <div v-if="!allDone" class="card">
    <p class="text-label mb-3">Primeiros passos</p>
    <div class="space-y-2">
      <div v-for="item in items" :key="item.key" class="flex items-center gap-2.5">
        <span
          class="w-5 h-5 rounded-full flex items-center justify-center text-micro shrink-0"
          :class="item.done ? 'bg-success text-white' : 'border-2 border-base'"
        >
          <span v-if="item.done">✓</span>
        </span>
        <span class="text-small" :class="item.done ? 'text-base-muted line-through' : 'text-base-primary'">
          {{ item.label }}
        </span>
      </div>
    </div>
    <p class="text-micro text-base-muted mt-3">{{ doneCount }}/{{ items.length }} concluídos</p>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  hasTopics: boolean
  hasMaterial: boolean
  hasCards: boolean
  hasReviewed: boolean
  streak: number
}>()

const items = computed(() => [
  { key: 'topic', label: 'Criar um tópico', done: props.hasTopics },
  { key: 'material', label: 'Adicionar material (nota ou PDF)', done: props.hasMaterial },
  { key: 'cards', label: 'Gerar ou criar cards', done: props.hasCards },
  { key: 'review', label: 'Fazer primeira revisão', done: props.hasReviewed },
  { key: 'streak', label: '3 dias de streak', done: props.streak >= 3 },
])

const doneCount = computed(() => items.value.filter(i => i.done).length)
const allDone = computed(() => doneCount.value === items.value.length)
</script>
