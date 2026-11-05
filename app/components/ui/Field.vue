<template>
  <div class="flex flex-col gap-1.5">
    <label v-if="label" :for="fieldId" class="text-meta font-semibold text-fg-strong" :class="hideLabel && 'sr-only'">
      {{ label }}
      <span v-if="optional" class="font-normal text-fg-muted">(opcional)</span>
    </label>
    <slot :id="fieldId" :describedby="describedBy" :invalid="!!error" />
    <p v-if="hint" :id="hintId" class="text-meta text-fg-muted">{{ hint }}</p>
    <p v-if="error" :id="errorId" role="alert" class="text-meta font-medium text-danger">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
// Internal piece of UiInput/UiTextarea/UiSelect (raio-X §D "Label fica interno"): label tied by for/id,
// hint and error tied by aria-describedby, error announced (role="alert").
const props = defineProps<{
  id?: string
  label?: string
  hint?: string
  error?: string
  hideLabel?: boolean
  optional?: boolean
}>()

const auto = useId()
const fieldId = computed(() => props.id ?? auto)
const hintId = computed(() => `${fieldId.value}-hint`)
const errorId = computed(() => `${fieldId.value}-error`)
const describedBy = computed(() => [props.hint && hintId.value, props.error && errorId.value].filter(Boolean).join(' ') || undefined)
</script>
