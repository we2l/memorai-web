<template>
  <UiErrorState v-if="loadError" title="Não foi possível carregar suas preferências" @retry="$emit('retry')" />
  <div v-else-if="loading" class="flex flex-col gap-3" aria-busy="true">
    <UiSkeleton variant="block" />
    <UiSkeleton variant="block" />
  </div>
  <div v-else class="flex flex-col gap-6">
    <SettingsDailyGoalPicker :settings="settings" />

    <div class="border-t border-line pt-5">
      <h3 class="mb-1 text-body font-semibold text-fg-strong">Lembrete diário</h3>
      <SettingsReminderPreferences :settings="settings" @retry="$emit('retry')" />
    </div>

    <div class="grid gap-4 border-t border-line pt-5 sm:grid-cols-3" data-testid="study-fields">
      <div class="flex flex-col gap-1">
        <UiSelect
          :model-value="settings.default_learning_mode ?? 'general'"
          label="Modo de estudo padrão"
          :options="modeOptions"
          @update:model-value="saveField('default_learning_mode', $event)"
        />
      </div>
      <div class="flex flex-col gap-1">
        <UiSelect
          :model-value="String(settings.daily_new_cards_limit ?? '')"
          label="Cards novos por dia"
          :options="newCardsOptions"
          @update:model-value="saveField('daily_new_cards_limit', $event === '' ? null : Number($event))"
        />
      </div>
      <div class="flex flex-col gap-1">
        <UiSelect
          :model-value="String(settings.daily_review_limit ?? '')"
          label="Revisões por dia"
          :options="reviewsOptions"
          @update:model-value="saveField('daily_review_limit', $event === '' ? null : Number($event))"
        />
      </div>
      <p class="min-h-5 text-meta text-success sm:col-span-3" role="status" data-testid="study-saved">{{ fieldsSaved ? 'Salvo' : '' }}</p>
    </div>

    <SettingsStudyPreferences :settings="settings" class="border-t border-line pt-5" />

    <PodcastDailyEpisodeSwitch class="border-t border-line pt-3" />
  </div>
</template>

<script setup lang="ts">
// "Estudo e lembretes" (prd-4g-conta-onboarding-v3 RF-F1): the goal, the reminder and the review preferences
// in one place. Each field saves itself; the limits of the day were hidden before this page.
import type { UserSettings } from '~/types'
import { LEARNING_MODES } from '~/utils/learningModes'

const props = defineProps<{ settings: UserSettings; loading?: boolean; loadError?: boolean }>()
defineEmits<{ (e: 'retry'): void }>()

const { $api } = useNuxtApp()
const auth = useAuthStore()
const { run } = useApiAction()
const { saved: fieldsSaved, mark } = useSavedHint()

const modeOptions = LEARNING_MODES.map(m => ({ value: m.value, label: m.label }))

/** The presets, plus the value of the account when it is another one. */
function withValue(presets: number[], current: number | null | undefined, empty: string) {
  const all = current && !presets.includes(current) ? [...presets, current].sort((a, b) => a - b) : presets
  return [{ value: '', label: empty }, ...all.map(n => ({ value: String(n), label: String(n) }))]
}
// Without a limit of its own the API gives 20 new cards a day
const newCardsOptions = computed(() => withValue([5, 10, 30, 50, 100], props.settings.daily_new_cards_limit, '20 (padrão)'))
const reviewsOptions = computed(() => withValue([30, 50, 100, 200, 500], props.settings.daily_review_limit, 'Sem limite'))

async function saveField<K extends keyof UserSettings>(key: K, value: UserSettings[K]) {
  const previous = props.settings[key]
  props.settings[key] = value
  const ok = await run(() => $api('/settings', { method: 'PUT', body: { [key]: value } }), { error: 'Não foi possível salvar.' })
  if (ok === undefined) {
    props.settings[key] = previous
    return
  }
  mark()
  // Hoje and "Novo caderno" read the default mode from the session
  if (key === 'default_learning_mode' && auth.user) auth.user.default_learning_mode = value as string
}
</script>
