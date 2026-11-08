<template>
  <div class="flex flex-col gap-5" data-testid="review-options">
    <UiSwitch
      :model-value="!!settings.review_swipe"
      label="Deslizar para avaliar"
      :description="settings.review_buttons === 'four' ? 'No celular, com a resposta na tela: direita = Bom, esquerda = De novo. Os botões continuam.' : 'No celular, com a resposta na tela: direita = Lembrei, esquerda = Não lembrei. Os botões continuam.'"
      data-testid="review-swipe"
      @update:model-value="(v) => save('review_swipe', v)"
    />

    <UiSelect
      :model-value="settings.light_day == null ? '' : String(settings.light_day)"
      label="Dia leve"
      hint="Quase nada vence nesse dia: os cards de intervalo longo voltam um dia antes."
      :options="dayOptions"
      data-testid="light-day"
      @update:model-value="(v) => save('light_day', v === '' || v == null ? null : Number(v))"
    />

    <UiSwitch
      :model-value="settings.pause_new_on_backlog !== false"
      label="Pausar cards novos com atraso"
      description="Com muitos cards atrasados, os novos esperam até você recuperar o atraso."
      data-testid="pause-new"
      @update:model-value="(v) => save('pause_new_on_backlog', v)"
    />

    <p class="-mt-2 min-h-5 text-meta text-success" role="status" data-testid="review-options-saved">{{ saved ? 'Salvo' : '' }}</p>
  </div>
</template>

<script setup lang="ts">
// Revisão v5, Fase B in Configurações → Estudo (RF-F11): swipe to rate (off by default, B-D10), the light day
// (one weekday, none by default, B-D11) and the pause of new cards with a backlog (on by default, B-D5). Each field
// saves itself with "Salvo", optimistic with rollback; auth.user follows (the session reads /me).
import type { UserSettings } from '~/types'

type Field = 'review_swipe' | 'light_day' | 'pause_new_on_backlog'

const props = defineProps<{ settings: UserSettings }>()

const { $api } = useNuxtApp()
const auth = useAuthStore()
const { run } = useApiAction()
const { saved, mark } = useSavedHint()

const DAYS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado']
const dayOptions = [{ value: '', label: 'Nenhum' }, ...DAYS.map((label, i) => ({ value: String(i), label: label[0]!.toUpperCase() + label.slice(1) }))]

async function save(field: Field, value: boolean | number | null) {
  const previous = props.settings[field]
  Object.assign(props.settings, { [field]: value })
  const ok = await run(() => $api('/settings', { method: 'PUT', body: { [field]: value } }), {
    error: 'Não foi possível salvar. Tente de novo.',
  })
  if (ok === undefined) {
    Object.assign(props.settings, { [field]: previous })
    return
  }
  mark()
  if (auth.user) Object.assign(auth.user, { [field]: value })
  useAnalytics().track('settings_review_option', { field, value: value === null ? 'none' : String(value) })
}
</script>
