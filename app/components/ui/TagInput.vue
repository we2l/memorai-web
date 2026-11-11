<template>
  <div class="flex flex-col gap-2">
    <UiInput
      v-model="input"
      :label="label"
      :hide-label="hideLabel"
      :placeholder="placeholder"
      @keydown.enter.prevent="add"
      @keydown.,="add"
      @blur="flush"
    />
    <!-- The tags under the field, so a visible label stays right above it -->
    <div v-if="modelValue.length" class="flex flex-wrap gap-1.5">
      <span
        v-for="(tag, i) in modelValue"
        :key="i"
        class="inline-flex items-center gap-0.5 rounded-chip bg-action-subtle py-0.5 pl-2.5 pr-1 text-label font-medium text-action-fg"
      >
        #{{ tag }}
        <button
          type="button"
          class="inline-flex size-6 items-center justify-center rounded-chip transition-colors duration-fast hover:text-danger"
          :aria-label="`Remover a tag ${tag}`"
          @click="remove(i)"
        >
          <X class="size-3.5" aria-hidden="true" />
        </button>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { X } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  modelValue: string[]
  placeholder?: string
  /** Name of the field: hidden by default, visible with hide-label false */
  label?: string
  hideLabel?: boolean
}>(), {
  placeholder: 'Adicionar tag e pressionar Enter...',
  label: 'Tags',
  hideLabel: true,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string[]): void
}>()

const input = ref('')

function add() {
  const tag = input.value.trim().replace(/^#/, '').replace(/,/g, '')
  if (tag && !props.modelValue.includes(tag)) {
    emit('update:modelValue', [...props.modelValue, tag])
  }
  input.value = ''
}

function flush() {
  if (input.value.trim()) add()
}

function remove(index: number) {
  emit('update:modelValue', props.modelValue.filter((_, i) => i !== index))
}
</script>
