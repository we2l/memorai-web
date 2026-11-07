<template>
  <div data-testid="batch-size">
    <UiRadioGroup
      :model-value="value"
      label="Tamanho do lote"
      name="batch-size"
      hint="Quantos cards vêm em cada lote da revisão. A meta do dia conta nesse tamanho."
      variant="cards"
      :columns="3"
      :options="options"
      :disabled="disabled"
      @update:model-value="save"
    />
    <p class="mt-2 min-h-5 text-meta text-success" role="status" data-testid="batch-size-saved">{{ saved ? 'Salvo' : '' }}</p>
  </div>
</template>

<script setup lang="ts">
// Cards per batch (10, 20 or 30; 20 is the default): the review cuts its batches with it and /stats.goal counts
// in it. Saves itself with "Salvo", like the other study fields; optimistic, with rollback if the PUT fails.
// The session reads /me.review_batch_size when it opens, so the session store follows the saved value.
import type { UserSettings } from '~/types'
import { REVIEW_BATCH, REVIEW_BATCH_SIZES, cardsMinutes, reviewBatchSizeOf } from '~/utils/reviewBatch'

const props = defineProps<{ settings: UserSettings; disabled?: boolean }>()

const { $api } = useNuxtApp()
const auth = useAuthStore()
const { run } = useApiAction()
const { saved, mark } = useSavedHint()

const value = computed(() => String(reviewBatchSizeOf(props.settings.review_batch_size)))
const options = REVIEW_BATCH_SIZES.map(n => {
  const minutes = `~${cardsMinutes(n)} min por lote`
  return { value: String(n), label: `${n} cards`, description: n === REVIEW_BATCH ? `${minutes} · padrão` : minutes }
})

async function save(next: string) {
  const previous = props.settings.review_batch_size
  const size = Number(next)
  props.settings.review_batch_size = size
  const ok = await run(() => $api('/settings', { method: 'PUT', body: { review_batch_size: size } }), {
    error: 'Não foi possível salvar o tamanho do lote.',
  })
  if (ok === undefined) {
    props.settings.review_batch_size = previous
    return
  }
  mark()
  if (auth.user) auth.user.review_batch_size = size
  useAnalytics().track('settings_batch_size', { size })
}
</script>
