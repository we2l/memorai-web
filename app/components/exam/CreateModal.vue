<script setup lang="ts">
import { X, CalendarPlus } from 'lucide-vue-next'

const emit = defineEmits<{
  close: []
  created: []
}>()

const examStore = useExamStore()
const topicStore = useTopicStore()
const toast = useToast()

const title = ref('')
const examDate = ref('')
const selectedTopicIds = ref<string[]>([])
const submitting = ref(false)

// Load topics if not loaded
onMounted(async () => {
  if (!topicStore.tree.length) {
    await topicStore.fetchTree()
  }
})

const topics = computed(() => {
  const flat: { id: string; name: string }[] = []
  function walk(items: any[], depth = 0) {
    for (const t of items) {
      flat.push({ id: t.id, name: depth > 0 ? '  '.repeat(depth) + t.name : t.name })
      if (t.children?.length) walk(t.children, depth + 1)
    }
  }
  walk(topicStore.tree)
  return flat
})

const preview = computed(() => {
  if (!selectedTopicIds.value.length || !examDate.value) return null
  const daysRemaining = Math.ceil((new Date(examDate.value).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  return {
    topicCount: selectedTopicIds.value.length,
    daysRemaining: Math.max(0, daysRemaining),
  }
})

const isValid = computed(() => title.value.trim() && examDate.value && selectedTopicIds.value.length > 0)

async function handleSubmit() {
  if (!isValid.value || submitting.value) return
  submitting.value = true
  try {
    await examStore.createExam({
      title: title.value.trim(),
      exam_date: examDate.value,
      topic_ids: selectedTopicIds.value,
    })
    emit('created')
  } catch (e: any) {
    const msg = e?.data?.errors?.limit?.[0] || e?.data?.message || 'Erro ao criar prova'
    toast.show(msg, 'error')
  } finally {
    submitting.value = false
  }
}

function toggleTopic(id: string) {
  const idx = selectedTopicIds.value.indexOf(id)
  if (idx >= 0) {
    selectedTopicIds.value.splice(idx, 1)
  } else {
    selectedTopicIds.value.push(id)
  }
}

// Min date = tomorrow
const minDate = computed(() => {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
})
</script>

<template>
  <UiModal :model-value="true" size="md" @update:model-value="emit('close')">
    <template #header>
      <div class="flex items-center gap-2">
        <CalendarPlus class="w-5 h-5 text-amber-500" />
        <span class="font-semibold text-base-primary">Nova prova</span>
      </div>
    </template>

    <form @submit.prevent="handleSubmit" class="space-y-4">
      <!-- Title -->
      <div>
        <label class="block text-sm font-medium text-base-secondary mb-1">Título</label>
        <input
          v-model="title"
          type="text"
          placeholder="Ex: TJ-SP Escrevente, Prova de Constitucional II"
          class="input-base w-full"
          autofocus
        />
      </div>

      <!-- Date -->
      <div>
        <label class="block text-sm font-medium text-base-secondary mb-1">Data da prova</label>
        <input
          v-model="examDate"
          type="date"
          :min="minDate"
          class="input-base w-full"
        />
      </div>

      <!-- Topics -->
      <div>
        <label class="block text-sm font-medium text-base-secondary mb-1">Cadernos vinculados</label>
        <div class="max-h-48 overflow-y-auto space-y-1 border border-border-primary rounded-xl p-2 bg-surface-secondary">
          <label
            v-for="topic in topics"
            :key="topic.id"
            class="flex items-center gap-2 p-2 rounded-lg hover:bg-surface-primary cursor-pointer transition-colors"
          >
            <input
              type="checkbox"
              :checked="selectedTopicIds.includes(topic.id)"
              class="w-4 h-4 accent-[var(--color-accent-primary)]"
              @change="toggleTopic(topic.id)"
            />
            <span class="text-sm text-base-primary">{{ topic.name }}</span>
          </label>
          <p v-if="!topics.length" class="text-sm text-base-muted text-center py-4">
            Crie cadernos primeiro
          </p>
        </div>
      </div>

      <!-- Preview -->
      <div v-if="preview" class="text-sm text-base-muted bg-surface-secondary rounded-lg p-3">
        {{ preview.topicCount }} {{ preview.topicCount === 1 ? 'caderno' : 'cadernos' }} ·
        {{ preview.daysRemaining }} dias restantes
      </div>

      <!-- Submit -->
      <div class="flex justify-end gap-3 pt-2">
        <button type="button" class="btn-secondary" @click="emit('close')">Cancelar</button>
        <button
          type="submit"
          class="btn-primary"
          :disabled="!isValid || submitting"
        >
          {{ submitting ? 'Criando...' : 'Criar prova' }}
        </button>
      </div>
    </form>
  </UiModal>
</template>
