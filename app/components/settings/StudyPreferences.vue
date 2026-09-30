<template>
  <div class="space-y-6">
    <UiErrorState v-if="loadError" title="Não foi possível carregar suas preferências de estudo" @retry="$emit('retry')" />
    <template v-else>
      <fieldset>
        <legend class="text-title mb-1">Quanto você quer lembrar</legend>
        <p class="text-small text-base-muted mb-3">Mais revisões por dia ↔ menos revisões. Vale para todos os seus cadernos.</p>
        <UiRadioCards
          :model-value="retentionKey"
          name="retention"
          :options="retentionOptions"
          :disabled="disabled"
          @update:model-value="setRetention"
        />
      </fieldset>

      <fieldset>
        <legend class="text-title mb-1">Diário de erros</legend>
        <p class="text-small text-base-muted mb-3">Quando você marca "Não lembrei", podemos perguntar o motivo.</p>
        <UiRadioCards
          :model-value="settings.error_diary_mode ?? 'sometimes'"
          name="diary"
          :options="diaryOptions"
          :disabled="disabled"
          @update:model-value="setDiary"
        />
      </fieldset>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { UserSettings } from '~/types'

const props = defineProps<{ settings: UserSettings; loadError?: boolean; disabled?: boolean }>()
defineEmits<{ (e: 'retry'): void }>()

const { $api } = useNuxtApp()
const { run } = useApiAction()

// No jargon (RF-F7.4): "Quanto você quer lembrar" instead of "retenção desejada"
const retentionOptions = [
  { value: '0.85', label: 'Menos revisões', description: 'Lembrar 85% · menos cards por dia' },
  { value: '0.9', label: 'Equilibrado', description: 'Lembrar 90% · recomendado' },
  { value: '0.95', label: 'Mais revisões', description: 'Lembrar 95% · mais cards por dia' },
]
const diaryOptions = [
  { value: 'always', label: 'Sempre', description: 'A cada "Não lembrei"' },
  { value: 'sometimes', label: 'Às vezes', description: 'No 1º erro e a cada 3 · recomendado' },
  { value: 'never', label: 'Nunca', description: 'Não perguntar' },
]

const retentionKey = computed(() => {
  const r = props.settings.desired_retention ?? 0.9
  // Closest UI option (the API accepts 0.70–0.97)
  return retentionOptions.reduce((best, o) => Math.abs(Number(o.value) - r) < Math.abs(Number(best.value) - r) ? o : best).value
})

async function save(body: Partial<UserSettings>, success: string) {
  const previous = { ...props.settings }
  Object.assign(props.settings, body)
  const ok = await run(() => $api('/settings', { method: 'PUT', body }), { success, error: 'Não foi possível salvar.' })
  if (ok === undefined) Object.assign(props.settings, previous)
}

function setRetention(value: string) {
  return save({ desired_retention: Number(value) }, 'Preferência salva. Suas revisões foram reajustadas.')
}

function setDiary(value: string) {
  return save({ error_diary_mode: value as UserSettings['error_diary_mode'] }, 'Preferência salva.')
}
</script>
