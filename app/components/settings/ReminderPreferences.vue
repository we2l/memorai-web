<template>
  <div>
    <UiErrorState v-if="loadError" title="Não foi possível carregar seus lembretes" @retry="$emit('retry')" />
    <div v-else class="space-y-4">
      <p
        v-if="suppressed"
        class="text-small text-[var(--badge-warning-text)] bg-[var(--badge-warning-bg)] rounded-lg px-3 py-2"
        role="status"
        data-testid="reminder-suppressed"
      >
        Seu e-mail recusou nossas mensagens. Atualize o e-mail para reativar os lembretes.
      </p>

      <button
        type="button"
        role="switch"
        :aria-checked="enabled"
        aria-describedby="reminder-help"
        :disabled="suppressed || pending"
        class="w-full flex items-center gap-3 min-h-[2.75rem] text-left disabled:opacity-60 disabled:cursor-not-allowed"
        data-testid="reminder-switch"
        @click="toggle"
      >
        <span class="flex-1">
          <span class="block text-base-primary">E-mails de estudo</span>
          <span id="reminder-help" class="block text-micro text-base-muted">
            Um e-mail por dia, só quando houver cards para revisar e você ainda não tiver estudado. Horário de Brasília.
          </span>
        </span>
        <span
          class="relative w-10 h-6 rounded-full transition-colors shrink-0"
          :class="enabled ? 'bg-[var(--color-accent-primary)]' : 'bg-[var(--border-hover)]'"
          aria-hidden="true"
        >
          <span
            class="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
            :class="enabled ? 'left-[18px]' : 'left-0.5'"
          />
        </span>
      </button>

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

/** Optimistic update with rollback (RF-F01). */
async function save(body: Partial<UserSettings>, success: string) {
  const previous = { reminder_enabled: props.settings.reminder_enabled, reminder_hour: props.settings.reminder_hour }
  Object.assign(props.settings, body)
  try {
    await run(() => $api('/settings', { method: 'PUT', body }), { success, error: 'Não foi possível salvar o lembrete.', rethrow: true })
  } catch (e) {
    Object.assign(props.settings, previous)
    if (isEmailSuppressedError(e)) props.settings.email_suppressed = true
  }
}

function toggle() {
  const on = !enabled.value
  return save({ reminder_enabled: on }, on ? `Lembrete ativado para ${formatReminderHour(hour.value)}.` : 'Lembretes desativados.')
}

function setHour(value: string) {
  const h = Number(value)
  if (h === hour.value) return
  return save({ reminder_hour: h }, `Lembrete às ${formatReminderHour(h)}.`)
}
</script>
