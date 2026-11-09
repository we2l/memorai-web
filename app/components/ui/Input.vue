<template>
  <UiField v-slot="field" :id="id" :label="label" :hint="hint" :error="error" :hide-label="hideLabel" :optional="optional" v-bind="split.root">
    <div
      class="flex min-h-touch items-center gap-2 rounded-control border px-3 transition-colors duration-fast focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus"
      :class="[
        field.invalid ? 'border-danger' : 'border-line-input focus-within:border-focus',
        disabled ? 'cursor-not-allowed bg-soft opacity-60' : 'bg-raised',
      ]"
    >
      <span v-if="$slots.prefix" class="flex shrink-0 items-center text-fg-muted"><slot name="prefix" /></span>
      <input
        :id="field.id"
        ref="input"
        v-bind="split.rest"
        :value="modelValue ?? ''"
        :type="type"
        :disabled="disabled"
        :aria-invalid="field.invalid ? 'true' : undefined"
        :aria-describedby="[field.describedby, split.rest['aria-describedby']].filter(Boolean).join(' ') || undefined"
        class="min-w-0 flex-1 bg-transparent py-2.5 text-body text-fg-strong outline-none placeholder:text-fg-muted disabled:cursor-not-allowed"
        @input="onInput"
      >
      <span v-if="$slots.suffix" class="flex shrink-0 items-center text-fg-muted"><slot name="suffix" /></span>
    </div>
  </UiField>
</template>

<script setup lang="ts">
// Text field (raio-X §D): label, hint and error wired for screen readers; border --line-input (>= 3:1,
// WCAG 1.4.11); the focus outline (same as base.css) goes around the whole field, prefix/suffix included. Other attributes
// (name, autocomplete, required, placeholder, inputmode, data-testid) go to the <input>.
defineOptions({ inheritAttrs: false })

withDefaults(defineProps<{
  modelValue?: string | number | null
  label?: string
  hint?: string
  error?: string
  type?: string
  id?: string
  disabled?: boolean
  hideLabel?: boolean
  optional?: boolean
}>(), { modelValue: undefined, label: undefined, hint: undefined, error: undefined, type: 'text', id: undefined })

const emit = defineEmits<{ (e: 'update:modelValue', value: string): void }>()

const attrs = useAttrs()
const split = computed(() => splitFieldAttrs(attrs))
const input = ref<HTMLInputElement | null>(null)

function onInput(e: Event) {
  emit('update:modelValue', (e.target as HTMLInputElement).value)
}

defineExpose({ focus: () => input.value?.focus(), el: input })
</script>
