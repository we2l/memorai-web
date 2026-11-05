<template>
  <div class="flex min-h-touch items-center justify-between gap-4 py-2" v-bind="split.root">
    <span class="min-w-0">
      <label :id="labelId" :for="switchId" class="block text-body" :class="disabled ? 'cursor-not-allowed text-fg-muted' : 'cursor-pointer text-fg-strong'">
        <slot>{{ label }}</slot>
      </label>
      <span v-if="description" :id="descriptionId" class="block text-meta text-fg-muted">{{ description }}</span>
    </span>
    <button
      :id="switchId"
      v-bind="split.rest"
      type="button"
      role="switch"
      :aria-checked="modelValue ? 'true' : 'false'"
      :aria-labelledby="labelId"
      :aria-describedby="description ? descriptionId : undefined"
      :disabled="disabled"
      class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-nav before:absolute before:-inset-2.5 disabled:cursor-not-allowed"
      :class="[modelValue ? 'bg-action' : 'bg-line-input', disabled && 'opacity-60']"
      @click="emit('update:modelValue', !modelValue)"
    >
      <span class="size-5 rounded-full bg-on-action shadow-card transition-transform duration-nav" :class="modelValue ? 'translate-x-5.5' : 'translate-x-0.5'" aria-hidden="true" />
    </button>
  </div>
</template>

<script setup lang="ts">
// Switch (WAI-ARIA switch: button + aria-checked), the only place with role="switch" (check-ds).
// Controlled: it emits the next value and shows what the parent holds, so an optimistic save with
// rollback (ReminderPreferences) shows the real state. Replaces the 6 hand-made switches.
defineOptions({ inheritAttrs: false })

const props = defineProps<{
  modelValue: boolean
  label?: string
  description?: string
  disabled?: boolean
  id?: string
}>()
const emit = defineEmits<{ (e: 'update:modelValue', value: boolean): void }>()

const auto = useId()
const switchId = computed(() => props.id ?? auto)
const labelId = computed(() => `${switchId.value}-label`)
const descriptionId = computed(() => `${switchId.value}-desc`)
const attrs = useAttrs()
const split = computed(() => splitFieldAttrs(attrs))
</script>
