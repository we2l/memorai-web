<template>
  <UiField v-slot="field" :id="id" :label="label" :hint="hint" :error="error" :hide-label="hideLabel" :optional="optional" v-bind="split.root">
    <textarea
      :id="field.id"
      ref="textarea"
      v-bind="split.rest"
      :value="modelValue ?? ''"
      :rows="rows"
      :disabled="disabled"
      :aria-invalid="field.invalid ? 'true' : undefined"
      :aria-describedby="[field.describedby, split.rest['aria-describedby']].filter(Boolean).join(' ') || undefined"
      class="w-full resize-y rounded-control border px-3 py-2.5 text-body text-fg-strong transition-colors duration-fast placeholder:text-fg-muted disabled:cursor-not-allowed"
      :class="[
        field.invalid ? 'border-danger' : 'border-line-input focus:border-focus',
        disabled ? 'bg-soft opacity-60' : 'bg-raised',
      ]"
      @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
    />
  </UiField>
</template>

<script setup lang="ts">
// Multi-line field (raio-X §D): same contract as UiInput (label, hint, error, border >= 3:1).
defineOptions({ inheritAttrs: false })

withDefaults(defineProps<{
  modelValue?: string | null
  label?: string
  hint?: string
  error?: string
  id?: string
  rows?: number
  disabled?: boolean
  hideLabel?: boolean
  optional?: boolean
}>(), { modelValue: undefined, label: undefined, hint: undefined, error: undefined, id: undefined, rows: 4 })

const emit = defineEmits<{ (e: 'update:modelValue', value: string): void }>()

const attrs = useAttrs()
const split = computed(() => splitFieldAttrs(attrs))
const textarea = ref<HTMLTextAreaElement | null>(null)

defineExpose({ focus: () => textarea.value?.focus(), el: textarea })
</script>
