<template>
  <Transition name="slide-up">
    <div v-if="visible" class="w-full max-w-lg mx-auto">
      <div class="bg-[var(--bg-card)] border border-base rounded-2xl p-5 sm:p-6">
        <p class="text-sm text-base-primary font-medium mb-1">Por que você errou?</p>
        <p class="text-xs text-base-muted mb-3">Selecione um motivo para salvar.</p>

        <div class="flex flex-wrap gap-2 mb-3">
          <button
            v-for="opt in reasons"
            :key="opt.value"
            type="button"
            class="px-3 min-h-[36px] rounded-full text-xs font-medium transition-all"
            :aria-pressed="selected === opt.value"
            :class="selected === opt.value ? 'bg-accent-primary-subtle text-accent-primary border border-[var(--color-accent-primary)]/20' : 'bg-surface-secondary text-base-secondary border border-base hover:bg-surface-secondary'"
            @click="selected = opt.value"
          >
            <component :is="opt.icon" :size="12" class="inline" aria-hidden="true" /> {{ opt.label }}
          </button>
        </div>

        <label :for="`diary-note-${flashcardId}`" class="sr-only">O que te confundiu aqui?</label>
        <textarea
          :id="`diary-note-${flashcardId}`"
          v-model="note"
          class="textarea-base text-small"
          rows="2"
          placeholder="O que te confundiu aqui?"
        />

        <div class="flex flex-wrap items-center gap-2 justify-end mt-4">
          <button type="button" class="mr-auto text-micro text-base-muted underline underline-offset-2 min-h-[44px]" @click="neverAsk">
            Não perguntar mais
          </button>
          <!-- Skip is always available: the diary never blocks the review (RN-UX-04) -->
          <button type="button" class="text-sm text-base-secondary hover:text-base-primary px-3 min-h-[44px] transition-colors" @click="skip">Pular</button>
          <button
            type="button"
            class="btn-primary !py-1.5 !px-4 !min-h-[44px] text-sm"
            :disabled="!selected || saving || !reviewId"
            :aria-busy="!reviewId"
            @click="save"
          >
            {{ !reviewId ? 'Salvando avaliação…' : saving ? 'Salvando...' : 'Salvar' }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { RefreshCw, HelpCircle, Brain as BrainIcon, Frown } from 'lucide-vue-next'

const props = defineProps<{
  visible: boolean
  flashcardId: string
  reviewId: string
}>()

const emit = defineEmits<{
  (e: 'saved'): void
  (e: 'skipped'): void
}>()

const review = useReviewStore()
const toast = useToast()
const { run } = useApiAction()

const { $api } = useNuxtApp()
const saving = ref(false)
const selected = ref<string | null>(null)
const note = ref('')

const reasons = [
  { value: 'confused', label: 'Confundi', icon: RefreshCw },
  { value: 'didnt_know', label: 'Não sabia', icon: HelpCircle },
  { value: 'forgot', label: 'Esqueci', icon: BrainIcon },
  { value: 'silly_mistake', label: 'Erro bobo', icon: Frown },
]

async function save() {
  if (!selected.value) return
  if (!selected.value || !props.reviewId) return
  saving.value = true
  const ok = await run(() => $api('/error-logs', {
    method: 'POST',
    body: {
      flashcard_id: props.flashcardId,
      review_id: props.reviewId,
      reason: selected.value,
      note: note.value || null,
    },
  }), { error: 'Não foi possível salvar o diário. Você pode pular.' })
  saving.value = false
  if (ok === undefined) return
  reset()
  emit('saved')
}

/** "Não perguntar mais" → error_diary_mode = never, with undo. */
async function neverAsk() {
  const previous = review.errorDiaryMode
  const setMode = (mode: typeof previous) => $api('/settings', { method: 'PUT', body: { error_diary_mode: mode } })
  const ok = await run(() => setMode('never'), { error: 'Não foi possível salvar a preferência.' })
  if (ok === undefined) return
  review.errorDiaryMode = 'never'
  toast.show('Não vamos mais perguntar. Mude em Configurações → Estudo.', 'info', {
    action: {
      label: 'Desfazer',
      onClick: async () => {
        const undone = await run(() => setMode(previous), { error: 'Não foi possível desfazer.' })
        if (undone !== undefined) review.errorDiaryMode = previous
      },
    },
  })
  skip()
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
