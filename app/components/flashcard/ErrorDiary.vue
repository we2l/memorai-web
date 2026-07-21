<template>
  <Transition name="slide-up">
    <div v-if="visible" class="w-full max-w-lg mx-auto">
      <div class="bg-[#140824] border border-white/[0.06] rounded-2xl p-5 sm:p-6">
        <p class="text-sm text-baigi-text font-medium mb-1">Por que você errou?</p>
        <p class="text-xs text-white/55 mb-3">Selecione um motivo para salvar.</p>

        <div class="flex flex-wrap gap-2 mb-3">
          <button
            v-for="opt in reasons"
            :key="opt.value"
            type="button"
            class="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
            :class="selected === opt.value ? 'bg-[rgba(244,200,74,0.1)] text-[#F4C84A] border border-[#F4C84A]/40' : 'bg-white/[0.06] text-white/[0.65] border border-white/[0.06] hover:bg-white/[0.1]'"
            @click="selected = opt.value"
          >
            {{ opt.icon }} {{ opt.label }}
          </button>
        </div>

        <textarea
          v-model="note"
          class="textarea-base text-small"
          rows="2"
          placeholder="O que te confundiu aqui?"
        />

        <div class="flex gap-2 justify-end mt-4">
          <button type="button" class="text-sm text-white/70 hover:text-white px-3 py-1.5 transition-colors" @click="skip">Pular</button>
          <button
            type="button"
            class="btn-primary !py-1.5 !px-4 !min-h-0 text-sm"
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
