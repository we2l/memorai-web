<template>
  <div data-testid="daily-goal">
    <UiRadioGroup
      :model-value="value"
      label="Meta diária"
      name="daily-goal"
      :hint="`Um lote = ${size} cards. O Hoje e o fim de cada lote mostram quanto falta.`"
      variant="cards"
      :columns="3"
      :options="options"
      :disabled="disabled"
      @update:model-value="save"
    />
  </div>
</template>

<script setup lang="ts">
// Goal of the day in batches (prd-4g-conta-onboarding-v3 RF-F2): the same unit of Hoje and of the review; the
// minutes are only support, since they vary with the card. Optimistic, with rollback if the PUT fails.
import type { UserSettings } from '~/types'
import { cardsMinutes, reviewBatchSizeOf } from '~/utils/reviewBatch'

const props = defineProps<{ settings: UserSettings; disabled?: boolean }>()

const { $api } = useNuxtApp()
const { run } = useApiAction()

const value = computed(() => String(props.settings.daily_goal_batches ?? 3))
// The minutes follow the batch the person picked (10, 20 or 30 cards, BatchSizePicker)
const size = computed(() => reviewBatchSizeOf(props.settings.review_batch_size))
const options = computed(() => [1, 2, 3, 4, 5, 6].map((n) => {
  const minutes = `~${cardsMinutes(n * size.value)} min`
  return { value: String(n), label: `${n} ${n === 1 ? 'lote' : 'lotes'}`, description: n === 3 ? `${minutes} · padrão` : minutes }
}))

async function save(next: string) {
  const previous = props.settings.daily_goal_batches
  const batches = Number(next)
  props.settings.daily_goal_batches = batches
  const ok = await run(() => $api('/settings', { method: 'PUT', body: { daily_goal_batches: batches } }), {
    success: 'Meta salva',
    error: 'Não foi possível salvar a meta.',
  })
  if (ok === undefined) {
    props.settings.daily_goal_batches = previous
    return
  }
  useAnalytics().track('settings_goal', { batches })
}
</script>
