<template>
  <UiModal :open="modelValue" @close="emit('update:modelValue', false)" size="md">
    <template #title>Novo simulado</template>
    <template #default>
      <div class="space-y-5">
        <!-- Caderno -->
        <div>
          <label class="label-base">Caderno</label>
          <select v-model="form.topic_id" class="input-base w-full">
            <option value="" disabled>Selecione um caderno</option>
            <option v-for="t in topics" :key="t.id" :value="t.id">{{ t.name }}</option>
          </select>
        </div>

        <!-- Quantidade -->
        <div>
          <label class="label-base">Questões</label>
          <div class="flex gap-2 flex-wrap">
            <button
              v-for="qty in quantityOptions"
              :key="qty"
              class="px-3 py-1.5 rounded-lg text-sm border transition-colors"
              :class="form.quantity === qty ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-50)] text-[var(--color-primary-700)]' : 'border-[var(--border-base)] text-base-secondary hover:border-[var(--color-primary-300)]'"
              :disabled="isFree && qty > 10"
              @click="form.quantity = qty"
            >
              {{ qty }}
              <span v-if="isFree && qty > 10" class="ml-1 text-[10px] opacity-60">Pro</span>
            </button>
          </div>
        </div>

        <!-- Tipos -->
        <div>
          <label class="label-base">Tipos de questão</label>
          <div class="space-y-2">
            <label class="flex items-center gap-2 text-sm text-base-primary cursor-pointer">
              <input type="checkbox" value="multiple_choice" v-model="form.types" class="accent-[var(--color-primary-500)]" />
              Múltipla escolha
            </label>
            <label class="flex items-center gap-2 text-sm text-base-primary cursor-pointer">
              <input type="checkbox" value="true_false" v-model="form.types" class="accent-[var(--color-primary-500)]" />
              Verdadeiro / Falso
            </label>
            <label class="flex items-center gap-2 text-sm cursor-pointer" :class="isFree ? 'text-base-muted' : 'text-base-primary'">
              <input type="checkbox" value="short_answer" v-model="form.types" class="accent-[var(--color-primary-500)]" :disabled="isFree" />
              Dissertativa curta
              <span v-if="isFree" class="text-[10px] bg-[var(--color-primary-50)] text-[var(--color-primary-500)] px-1.5 py-0.5 rounded-full font-medium">Pro</span>
            </label>
          </div>
        </div>

        <!-- Timer -->
        <div>
          <label class="label-base">Timer</label>
          <select v-model="form.time_limit" class="input-base w-full">
            <option :value="null">Sem limite</option>
            <option :value="900">15 minutos</option>
            <option :value="1800">30 minutos</option>
            <option :value="3600">60 minutos</option>
            <option :value="5400">90 minutos</option>
          </select>
        </div>

        <!-- Modo -->
        <div>
          <label class="label-base">Modo</label>
          <div class="grid grid-cols-2 gap-3">
            <button
              class="p-3 rounded-xl border text-left transition-colors"
              :class="form.mode === 'learning' ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-50)]' : 'border-[var(--border-base)] hover:border-[var(--color-primary-300)]'"
              @click="form.mode = 'learning'"
            >
              <p class="font-medium text-sm text-base-primary">Aprendizado</p>
              <p class="text-xs text-base-muted mt-0.5">Feedback imediato após cada questão</p>
            </button>
            <button
              class="p-3 rounded-xl border text-left transition-colors"
              :class="form.mode === 'exam' ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-50)]' : 'border-[var(--border-base)] hover:border-[var(--color-primary-300)]'"
              @click="form.mode = 'exam'"
            >
              <p class="font-medium text-sm text-base-primary">Prova</p>
              <p class="text-xs text-base-muted mt-0.5">Gabarito só no final</p>
            </button>
          </div>
        </div>

        <!-- Dificuldade -->
        <div>
          <label class="label-base">Dificuldade</label>
          <select v-model="form.difficulty" class="input-base w-full">
            <option value="easy">Fácil</option>
            <option value="mixed">Mista</option>
            <option value="hard">Difícil</option>
          </select>
        </div>

        <!-- Preview -->
        <div class="p-3 rounded-xl bg-[var(--bg-soft)] text-sm text-base-secondary">
          {{ form.quantity }} questões · {{ typesLabel }} · {{ timerLabel }} · Modo {{ form.mode === 'learning' ? 'aprendizado' : 'prova' }}
        </div>
      </div>
    </template>
    <template #footer>
      <button class="btn-secondary" @click="emit('update:modelValue', false)">Cancelar</button>
      <button class="btn-primary" :disabled="!canSubmit || generating" @click="submit">
        <span v-if="generating">Gerando...</span>
        <span v-else>Gerar simulado</span>
      </button>
    </template>
  </UiModal>
</template>

<script setup lang="ts">
const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [v: boolean]; created: [quiz: any] }>()

const quizStore = useQuizStore()
const topicStore = useTopicStore()
const auth = useAuthStore()
const toast = useToast()

const generating = ref(false)

const isFree = computed(() => auth.user?.plan === 'free')
const topics = computed(() => flattenTopics(topicStore.tree))

const quantityOptions = [5, 10, 20, 30, 50]

const form = reactive({
  topic_id: '' as string,
  quantity: 10,
  types: ['multiple_choice', 'true_false'] as string[],
  time_limit: null as number | null,
  mode: 'learning' as 'learning' | 'exam',
  difficulty: 'mixed' as string,
})

const canSubmit = computed(() => form.topic_id && form.types.length > 0)

const typesLabel = computed(() => {
  const labels: Record<string, string> = { multiple_choice: 'MC', true_false: 'V/F', short_answer: 'Dissertativa' }
  return form.types.map((t) => labels[t]).join(' + ')
})

const timerLabel = computed(() => {
  if (!form.time_limit) return 'Sem timer'
  return `${form.time_limit / 60} min`
})

async function submit() {
  generating.value = true
  try {
    const quiz = await quizStore.createQuiz({
      topic_id: form.topic_id,
      quantity: form.quantity,
      types: form.types,
      time_limit: form.time_limit,
      mode: form.mode,
      difficulty: form.difficulty,
    })
    emit('created', quiz)
  } catch (e: any) {
    toast.show(e?.data?.message || 'Erro ao criar simulado', 'error')
  } finally {
    generating.value = false
  }
}

function flattenTopics(topics: any[]): any[] {
  const result: any[] = []
  for (const t of topics) {
    result.push(t)
    if (t.children?.length) result.push(...flattenTopics(t.children))
  }
  return result
}

onMounted(() => {
  if (!topicStore.tree.length) topicStore.fetchTree()
})
</script>
