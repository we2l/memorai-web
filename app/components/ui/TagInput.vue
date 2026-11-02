<template>
  <div>
    <div class="flex flex-wrap gap-1.5 mb-2" v-if="modelValue.length">
      <span
        v-for="(tag, i) in modelValue"
        :key="i"
        class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-label font-medium bg-action-subtle text-action-fg"
      >
        #{{ tag }}
        <button type="button" class="hover:text-danger transition-colors" :aria-label="`Remover a tag ${tag}`" @click="remove(i)">×</button>
      </span>
    </div>
    <UiInput
      v-model="input"
      :label="label"
      hide-label
      :placeholder="placeholder"
      @keydown.enter.prevent="add"
      @keydown.,="add"
      @blur="flush"
    />
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue: string[]
  placeholder?: string
  /** Accessible name of the field (hidden label) */
  label?: string
}>(), {
  placeholder: 'Adicionar tag e pressionar Enter...',
  label: 'Tags',
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
