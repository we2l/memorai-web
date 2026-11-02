<template>
  <UiField v-slot="field" :id="id" :label="label" :hint="hint" :error="error" :hide-label="hideLabel" v-bind="split.root">
    <div class="relative">
      <select
        :id="field.id"
        v-bind="split.rest"
        :value="modelValue ?? ''"
        :disabled="disabled"
        :aria-invalid="field.invalid ? 'true' : undefined"
        :aria-describedby="field.describedby"
        class="min-h-touch w-full cursor-pointer appearance-none truncate rounded-control border py-2.5 pl-3 pr-10 text-body transition-colors duration-nav disabled:cursor-not-allowed"
        :class="[
          field.invalid ? 'border-danger' : 'border-line-input focus:border-focus',
          disabled ? 'bg-subtle opacity-60' : 'bg-raised',
          modelValue ? 'text-fg-strong' : 'text-fg-muted',
        ]"
        @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
      >
        <option v-if="placeholder && !hasEmptyOption" value="" disabled>{{ placeholder }}</option>
        <option v-for="opt in options" :key="opt.value" :value="opt.value" :disabled="opt.disabled" class="text-fg-strong">
          {{ opt.label }}
        </option>
      </select>
      <ChevronDown class="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-fg-muted" aria-hidden="true" />
    </div>
  </UiField>
</template>

<script setup lang="ts">
// Select (raio-X §D, rewritten): native <select>. Keyboard, screen readers and the phone picker come
// from the browser, and the list never fights a Modal for the z-index (the old one was z-50 inside z-50).
// Same API as before (modelValue, options, placeholder, disabled, id for an outside <label for>) plus
// label/hint/error. Listeners stay on the root: a disabled <select> gets no click, its parent does.
import { ChevronDown } from 'lucide-vue-next'

defineOptions({ inheritAttrs: false })

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

const props = withDefaults(defineProps<{
  modelValue?: string | null
  options: SelectOption[]
  label?: string
  placeholder?: string
  hint?: string
  error?: string
  disabled?: boolean
  hideLabel?: boolean
  /** Lets an outside <label for> name the select */
  id?: string
}>(), { modelValue: undefined, label: undefined, placeholder: undefined, hint: undefined, error: undefined, id: undefined })

const emit = defineEmits<{ (e: 'update:modelValue', value: string): void }>()

const attrs = useAttrs()
const split = computed(() => splitFieldAttrs(attrs, { listeners: 'root' }))
const hasEmptyOption = computed(() => props.options.some(o => o.value === ''))
</script>
