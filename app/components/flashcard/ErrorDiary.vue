<template>
  <section v-if="visible" class="w-full rounded-card bg-raised p-5 shadow-1 sm:p-6" aria-labelledby="diary-title" data-testid="error-diary">
    <h2 id="diary-title" class="text-meta font-semibold text-fg-strong">Por que você errou?</h2>
    <p class="mb-3 text-label text-fg-muted">Escolha um motivo para salvar.</p>

    <div class="mb-3 flex flex-wrap gap-2" role="group" aria-label="Motivo do erro">
      <button
        v-for="opt in reasons"
        :key="opt.value"
        type="button"
        class="inline-flex min-h-touch items-center gap-1.5 rounded-control border px-3 text-meta font-medium transition-colors duration-fast"
        :aria-pressed="selected === opt.value"
        :class="selected === opt.value ? 'border-action bg-action-subtle text-action-fg' : 'border-line-strong bg-raised text-fg hover:bg-hover'"
        @click="selected = opt.value"
      >
        <component :is="opt.icon" class="size-3.5" aria-hidden="true" /> {{ opt.label }}
      </button>
    </div>

    <UiTextarea v-model="note" label="O que te confundiu aqui?" hide-label :rows="2" placeholder="O que te confundiu aqui?" />

    <div class="mt-4 flex flex-wrap items-center justify-end gap-2">
      <UiButton size="sm" variant="ghost" class="mr-auto" @click="neverAsk">Não perguntar mais</UiButton>
      <!-- Skip is always available: the diary never blocks the review (RN-UX-04) -->
      <UiButton size="sm" variant="ghost" @click="skip">Pular</UiButton>
      <UiButton size="sm" :disabled="!selected || !reviewId" :loading="saving" :aria-busy="!reviewId" @click="save">
        {{ !reviewId ? 'Salvando avaliação…' : 'Salvar' }}
      </UiButton>
    </div>
  </section>
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
