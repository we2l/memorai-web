<template>
  <div
    ref="root"
    role="radiogroup"
    :aria-label="label"
    class="grid auto-cols-fr grid-flow-col gap-1 rounded-chip bg-soft p-1"
    data-testid="ui-segmented"
    @keydown="onKey"
  >
    <button
      v-for="(o, i) in options"
      :key="String(o.value)"
      type="button"
      role="radio"
      :aria-checked="o.value === modelValue"
      :tabindex="o.value === modelValue || (!hasSelection && i === 0) ? 0 : -1"
      class="inline-flex min-h-9.5 items-center justify-center gap-1.5 rounded-chip px-3 text-meta font-semibold transition duration-fast ease-out"
      :class="o.value === modelValue ? 'bg-raised text-fg-strong shadow-1' : 'text-fg-muted hover:text-fg-strong'"
      :data-value="o.value"
      @click="select(o.value)"
    >
      {{ o.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
// Segmented control (prd-visual-e2 RF-1.3): a pill with the selected option raised (shadow-1). Replaces the UiTabs
// used as a form choice (lotes, tamanho, aparência, 3/7/14 dias). A radio group: one tab stop, arrows move and
// select (WAI-ARIA radio group), Home/End jump to the ends.
type Value = string | number

const props = defineProps<{
  modelValue: Value | null
  options: { value: Value; label: string }[]
  label: string
}>()
const emit = defineEmits<{ (e: 'update:modelValue', value: Value): void }>()

const root = ref<HTMLElement | null>(null)
const hasSelection = computed(() => props.options.some(o => o.value === props.modelValue))

function select(value: Value) {
  if (value !== props.modelValue) emit('update:modelValue', value)
}

function onKey(e: KeyboardEvent) {
  const keys: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }
  const n = props.options.length
  if (!n) return
  const current = Math.max(0, props.options.findIndex(o => o.value === props.modelValue))
  let next: number | null = null
  if (e.key in keys) next = (current + keys[e.key]! + n) % n
  else if (e.key === 'Home') next = 0
  else if (e.key === 'End') next = n - 1
  if (next === null) return
  e.preventDefault()
  select(props.options[next]!.value)
  void nextTick(() => root.value?.querySelectorAll<HTMLElement>('[role=radio]')[next!]?.focus())
}
</script>
