<template>
  <div data-testid="review-buttons">
    <UiRadioGroup
      :model-value="value"
      label="Botões da revisão"
      name="review-buttons"
      hint="Como você avalia cada card depois de ver a resposta."
      variant="cards"
      :columns="2"
      :options="options"
      :disabled="disabled"
      @update:model-value="save"
    />
    <p class="mt-2 min-h-5 text-meta text-success" role="status" data-testid="review-buttons-saved">{{ saved ? 'Salvo' : '' }}</p>
  </div>
</template>

<script setup lang="ts">
// "Não lembrei / Lembrei" (the default) or the 4 Anki buttons (prd-revisao-v5-fase-a RF-F6). Saves itself with
// "Salvo", like the other study fields; optimistic, with rollback if the PUT fails. The session reads
// /me.review_buttons when it opens, so auth.user follows the saved value.
import type { UserSettings } from '~/types'
import { reviewButtonsOf, type ReviewButtonsMode } from '~/utils/reviewButtons'

const props = defineProps<{ settings: UserSettings; disabled?: boolean }>()

const { $api } = useNuxtApp()
const auth = useAuthStore()
const { run } = useApiAction()
const { saved, mark } = useSavedHint()

const value = computed(() => reviewButtonsOf(props.settings.review_buttons))
const options = [
  { value: 'two', label: 'Lembrei / Não lembrei', description: 'Recomendado: dois botões e uma decisão só.' },
  { value: 'four', label: '4 botões, como no Anki', description: 'De novo, Difícil, Bom e Fácil.' },
]

async function save(next: string) {
  const previous = props.settings.review_buttons
  const mode: ReviewButtonsMode = reviewButtonsOf(next)
  props.settings.review_buttons = mode
  const ok = await run(() => $api('/settings', { method: 'PUT', body: { review_buttons: mode } }), {
    error: 'Não foi possível salvar os botões da revisão.',
  })
  if (ok === undefined) {
    props.settings.review_buttons = previous
    return
  }
  mark()
  if (auth.user) auth.user.review_buttons = mode
  useAnalytics().track('settings_review_buttons', { mode })
}
</script>
