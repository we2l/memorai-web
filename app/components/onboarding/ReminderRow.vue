<template>
  <div class="flex flex-wrap items-center gap-x-3 gap-y-1 p-3 rounded-xl bg-[var(--bg-card)] border border-base text-left" data-testid="onboarding-reminder">
    <button
      type="button"
      role="switch"
      :aria-checked="enabled"
      class="flex items-center gap-2 min-h-[2.75rem] text-small text-base-primary"
      @click="enabled = !enabled"
    >
      <span
        class="relative w-10 h-6 rounded-full transition-colors shrink-0"
        :class="enabled ? 'bg-[var(--color-accent-primary)]' : 'bg-[var(--border-hover)]'"
        aria-hidden="true"
      >
        <span class="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all" :class="enabled ? 'left-[18px]' : 'left-0.5'" />
      </span>
      <span><span aria-hidden="true">📬 </span>Lembrete diário</span>
    </button>
    <label for="onboarding-reminder-hour" class="sr-only">Horário do lembrete</label>
    <select
      id="onboarding-reminder-hour"
      v-model.number="hour"
      class="input-base !w-auto !py-1.5 !text-small"
      :disabled="!enabled"
    >
      <option v-for="h in REMINDER_HOURS" :key="h" :value="h">às {{ formatReminderHour(h) }}</option>
    </select>
    <p class="w-full text-micro text-base-muted">Você pode desligar quando quiser.</p>
  </div>
</template>

<script setup lang="ts">
const enabled = defineModel<boolean>('enabled', { required: true })
const hour = defineModel<number>('hour', { required: true })
</script>
