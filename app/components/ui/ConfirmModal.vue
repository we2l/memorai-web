<template>
  <UiModal v-model="open" size="sm" role="alertdialog">
    <h2 class="text-headline mb-2 pr-10">{{ title }}</h2>
    <p class="text-base-secondary text-small mb-4">{{ message }}</p>
    <slot />
    <div v-if="requireText" class="mb-4">
      <label :for="inputId" class="text-small text-base-secondary mb-1 block">
        Digite <strong class="text-base-primary">{{ requireText }}</strong> para confirmar
      </label>
      <input :id="inputId" v-model="typed" type="text" class="input-base w-full" autocomplete="off" />
    </div>
    <div class="flex gap-3 justify-end mt-2">
      <button class="btn-secondary" @click="open = false">{{ cancelLabel }}</button>
      <button
        :class="variant === 'primary' ? 'btn-primary' : 'btn-danger'"
        :disabled="loading || !textMatches"
        @click="$emit('confirm')"
      >
        {{ loading ? loadingLabel : confirmLabel }}
      </button>
    </div>
  </UiModal>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  loadingLabel?: string
  loading?: boolean
  variant?: 'danger' | 'primary'
  /** Typed confirmation required to enable the action (e.g. the caderno name). */
  requireText?: string
}>(), {
  confirmLabel: 'Confirmar',
  cancelLabel: 'Cancelar',
  loadingLabel: 'Aguarde...',
  loading: false,
  variant: 'danger',
  requireText: undefined,
})

defineEmits<{ (e: 'confirm'): void }>()

const open = defineModel<boolean>({ required: true })
const typed = ref('')
const inputId = `confirm-text-${Math.random().toString(36).slice(2, 8)}`
const textMatches = computed(() => !props.requireText || typed.value.trim() === props.requireText.trim())

watch(open, (v) => { if (v) typed.value = '' })
</script>
