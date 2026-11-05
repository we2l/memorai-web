<template>
  <div class="flex min-h-touch items-start gap-3 py-2.5" :class="disabled && 'opacity-60'" v-bind="split.root">
    <span class="relative mt-0.5 flex size-5 shrink-0">
      <input
        :id="inputId"
        v-bind="split.rest"
        type="checkbox"
        :checked="modelValue"
        :disabled="disabled"
        :aria-describedby="describedBy"
        class="peer size-5 cursor-pointer appearance-none rounded-tag border border-line-input bg-raised transition-colors duration-nav checked:border-action checked:bg-action disabled:cursor-not-allowed"
        @change="emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
      >
      <Check class="pointer-events-none absolute inset-0 m-auto size-3.5 text-on-action opacity-0 peer-checked:opacity-100" stroke-width="3" aria-hidden="true" />
    </span>
    <span class="min-w-0">
      <label :for="inputId" class="block cursor-pointer text-body text-fg-strong" :class="disabled && 'cursor-not-allowed'">
        <slot>{{ label }}</slot>
      </label>
      <span v-if="description" :id="descriptionId" class="block text-meta text-fg-muted">{{ description }}</span>
    </span>
  </div>
</template>

<script setup lang="ts">
// Checkbox (raio-X §D): native input (keyboard, form and screen reader for free) drawn with tokens;
// the row is 44 px tall and the label is part of the target.
import { Check } from 'lucide-vue-next'

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
const inputId = computed(() => props.id ?? auto)
const descriptionId = computed(() => `${inputId.value}-desc`)
const attrs = useAttrs()
const split = computed(() => splitFieldAttrs(attrs))
// Own description plus one from outside (an error message under the box)
const describedBy = computed(() => [props.description && descriptionId.value, attrs['aria-describedby']].filter(Boolean).join(' ') || undefined)
</script>
