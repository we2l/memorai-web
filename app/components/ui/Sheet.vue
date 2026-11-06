<template>
  <UiDialog
    :model-value="modelValue"
    :title="title"
    :description="description"
    :size="size"
    :dismissible="dismissible"
    :placement="side"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <template #default="scope"><slot v-bind="scope" /></template>
    <template v-if="$slots.footer" #footer="scope"><slot name="footer" v-bind="scope" /></template>
  </UiDialog>
</template>

<script setup lang="ts">
// Sheet (raio-X §D, tasks 12.1): the dialog anchored at the bottom (phone, with the safe area) or on the
// right (side panel). Same contract and the same layer logic as UiDialog.
withDefaults(defineProps<{
  modelValue: boolean
  title: string
  description?: string
  side?: 'bottom' | 'right'
  size?: 'sm' | 'md' | 'lg'
  dismissible?: boolean
}>(), { description: undefined, side: 'bottom', size: 'md', dismissible: true })

const emit = defineEmits<{ (e: 'update:modelValue', value: boolean): void }>()
</script>
