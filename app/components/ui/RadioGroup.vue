<template>
  <fieldset :disabled="disabled" :aria-describedby="hint ? hintId : undefined" class="min-w-0">
    <legend class="mb-2 text-meta font-semibold text-fg-strong" :class="hideLabel && 'sr-only'">{{ label }}</legend>
    <p v-if="hint" :id="hintId" class="-mt-1 mb-2 text-meta text-fg-muted">{{ hint }}</p>
    <div :class="variant === 'cards' ? ['grid gap-2', COLUMNS[columns]] : 'flex flex-col'">
      <label
        v-for="(opt, i) in options"
        :key="opt.value"
        class="flex cursor-pointer items-start gap-3 has-disabled:cursor-not-allowed has-disabled:opacity-60"
        :class="variant === 'cards'
          ? 'rounded-control border border-line-strong bg-raised p-3 transition-colors duration-nav hover:bg-subtle has-checked:border-action has-checked:bg-action-subtle'
          : 'min-h-touch py-2.5'"
      >
        <input
          type="radio"
          :name="groupName"
          :value="opt.value"
          :checked="modelValue === opt.value"
          :disabled="opt.disabled"
          :aria-labelledby="`${groupName}-${i}`"
          :aria-describedby="opt.description ? `${groupName}-${i}-desc` : undefined"
          class="mt-0.5 size-5 shrink-0 cursor-pointer appearance-none rounded-full border border-line-input bg-raised transition-all duration-nav checked:border-6 checked:border-action disabled:cursor-not-allowed"
          @change="emit('update:modelValue', opt.value)"
        >
        <span class="min-w-0">
          <span :id="`${groupName}-${i}`" class="block text-body text-fg-strong">{{ opt.label }}</span>
          <span v-if="opt.description" :id="`${groupName}-${i}-desc`" class="block text-meta text-fg-muted">{{ opt.description }}</span>
        </span>
      </label>
    </div>
  </fieldset>
</template>

<script setup lang="ts">
// Radio group (raio-X §D): native radios in a fieldset/legend, so the arrows, the group name and the
// form come from the browser. `cards` replaces RadioCards (2 uses) with the selected card in action tint.
export interface RadioOption {
  value: string
  label: string
  description?: string
  disabled?: boolean
}

const props = withDefaults(defineProps<{
  modelValue: string
  options: RadioOption[]
  /** Legend of the group (required: it names the group) */
  label: string
  hint?: string
  name?: string
  variant?: 'list' | 'cards'
  columns?: 1 | 2 | 3
  disabled?: boolean
  hideLabel?: boolean
}>(), { hint: undefined, name: undefined, variant: 'list', columns: 1 })

const emit = defineEmits<{ (e: 'update:modelValue', value: string): void }>()

const COLUMNS = { 1: 'grid-cols-1', 2: 'grid-cols-1 sm:grid-cols-2', 3: 'grid-cols-1 sm:grid-cols-3' }
const auto = useId()
const groupName = computed(() => props.name ?? auto)
const hintId = computed(() => `${groupName.value}-hint`)
</script>
