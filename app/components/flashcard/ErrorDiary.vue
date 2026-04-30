<template>
  <Transition name="slide-up">
    <div v-if="visible" class="w-full max-w-lg mx-auto">
      <div class="card border border-warning/30 p-4">
        <p class="text-small text-base-primary font-medium mb-1">Por que você errou?</p>
        <p class="text-micro text-base-muted mb-3">Selecione um motivo para salvar.</p>

        <div class="flex flex-wrap gap-2 mb-3">
          <button
            v-for="opt in reasons"
            :key="opt.value"
            type="button"
            class="px-3 py-1.5 rounded-full text-micro font-medium transition-colors"
            :class="selected === opt.value ? 'bg-warning/20 text-warning' : 'bg-surface-tertiary text-base-muted hover:bg-surface-secondary'"
            @click="selected = opt.value"
          >
            {{ opt.icon }} {{ opt.label }}
          </button>
        </div>

        <textarea
          v-model="note"
          class="textarea-base text-small"
          rows="2"
          placeholder="Nota rápida (opcional) — ex: confundi com o inciso X..."
        />

        <div class="flex gap-2 justify-end mt-3">
          <button type="button" class="btn-secondary text-small" @click="skip">Pular</button>
          <button
            type="button"
            class="btn-primary text-micro"
            :disabled="!selected || saving"
            @click="save"
          >
            {{ saving ? 'Salvando...' : 'Salvar' }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
const props = defineProps<{
  visible: boolean
  flashcardId: string
  reviewId: string
}>()

const emit = defineEmits<{
  (e: 'saved'): void
  (e: 'skipped'): void
}>()

const { $api } = useNuxtApp()
const saving = ref(false)
const selected = ref<string | null>(null)
const note = ref('')

const reasons = [
  { value: 'confused', label: 'Confundi', icon: '🔄' },
  { value: 'didnt_know', label: 'Não sabia', icon: '❓' },
  { value: 'forgot', label: 'Esqueci', icon: '🧠' },
  { value: 'silly_mistake', label: 'Erro bobo', icon: '😅' },
]

async function save() {
  if (!selected.value) return
  saving.value = true
  try {
    await $api('/error-logs', {
      method: 'POST',
      body: {
        flashcard_id: props.flashcardId,
        review_id: props.reviewId,
        reason: selected.value,
        note: note.value || null,
      },
    })
    reset()
    emit('saved')
  } catch {
  } finally {
    saving.value = false
  }
}

function skip() {
  reset()
  emit('skipped')
}

function reset() {
  selected.value = null
  note.value = ''
}

watch(() => props.visible, (val) => {
  if (val) reset()
})
</script>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 200ms ease-out;
}
.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(12px);
}
</style>
