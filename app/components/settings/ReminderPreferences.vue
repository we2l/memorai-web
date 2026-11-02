<template>
  <div>
    <UiErrorState v-if="loadError" title="Não foi possível carregar seus lembretes" @retry="$emit('retry')" />
    <div v-else class="space-y-4">
      <p
        v-if="suppressed"
        class="text-meta text-warning bg-warning-subtle rounded-control px-3 py-2"
        role="status"
        data-testid="reminder-suppressed"
      >
        Seu e-mail recusou nossas mensagens. Atualize o e-mail para reativar os lembretes.
      </p>

      <UiSwitch
        :model-value="enabled"
        label="E-mails de estudo"
        description="Um e-mail por dia, só quando houver cards para revisar e você ainda não tiver estudado. Horário de Brasília."
        :disabled="suppressed || pending"
        data-testid="reminder-switch"
        @update:model-value="toggle"
      />

      <div class="max-w-[12rem]">
        <label for="reminder-hour" class="text-label mb-1 block">Horário</label>
        <UiSelect
          id="reminder-hour"
          :model-value="String(hour)"
          :options="REMINDER_HOUR_OPTIONS"
          :disabled="!enabled || suppressed || pending"
          @update:model-value="setHour"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { UserSettings } from '~/types'

const props = defineProps<{ settings: UserSettings; loadError?: boolean }>()
defineEmits<{ (e: 'retry'): void }>()

const { $api } = useNuxtApp()
const { run, pending } = useApiAction()

const enabled = computed(() => props.settings.reminder_enabled !== false && !props.settings.email_suppressed)
const hour = computed(() => props.settings.reminder_hour ?? DEFAULT_REMINDER_HOUR)
const suppressed = computed(() => !!props.settings.email_suppressed)

/** Optimistic update with rollback (RF-F01). Resolves true when the PUT succeeded. */
async function save(body: Partial<UserSettings>, success: string): Promise<boolean> {
  const previous = { reminder_enabled: props.settings.reminder_enabled, reminder_hour: props.settings.reminder_hour }
  Object.assign(props.settings, body)
  try {
    await run(() => $api('/settings', { method: 'PUT', body }), { success, error: 'Não foi possível salvar o lembrete.', rethrow: true })
    return true
  } catch (e) {
    Object.assign(props.settings, previous)
    if (isEmailSuppressedError(e)) props.settings.email_suppressed = true
    return false
  }
}

async function toggle() {
  const on = !enabled.value
  const ok = await save({ reminder_enabled: on }, on ? `Lembrete ativado para ${formatReminderHour(hour.value)}.` : 'Lembretes desativados.')
  if (ok) useAnalytics().track('reminder_toggled', { on, hour: hour.value, source: 'settings' })
}

function setHour(value: string) {
  const h = Number(value)
  if (h === hour.value) return
  return save({ reminder_hour: h }, `Lembrete às ${formatReminderHour(h)}.`)
}
</script>
