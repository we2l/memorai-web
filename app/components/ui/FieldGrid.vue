<template>
  <div class="grid gap-x-4 gap-y-5 sm:*:row-span-3 sm:*:grid sm:*:grid-cols-1 sm:*:grid-rows-subgrid" :class="COLUMNS[cols]" data-testid="ui-field-grid">
    <slot />
  </div>
</template>

<script setup lang="ts">
// Fields side by side (UiInput, UiSelect, UiTextarea): one column on the phone; from `sm` each field becomes a
// subgrid of three rows (label, control, hint + error), so a label that wraps or a longer hint never pushes the
// control of the next field out of line (its one column is minmax(0, 1fr), so a long label wraps instead of
// widening the field). Every field of the grid shows its label (a hidden one leaves the row).
withDefaults(defineProps<{ cols?: 2 | 3 }>(), { cols: 2 })

const COLUMNS = { 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3' } as const
</script>
