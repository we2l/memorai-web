<template>
  <UiModal v-model="open" size="sm" role="alertdialog" :aria-label="title">
    <h2 class="text-headline mb-2">{{ title }}</h2>
    <p class="text-base-secondary text-small mb-6">{{ message }}</p>
    <div class="flex gap-3 justify-end">
      <button class="btn-secondary" @click="open = false">{{ cancelLabel }}</button>
      <button
        :class="variant === 'primary' ? 'btn-primary' : 'btn-danger'"
        :disabled="loading"
        @click="$emit('confirm')"
      >
        {{ loading ? loadingLabel : confirmLabel }}
      </button>
    </div>
  </UiModal>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  loadingLabel?: string
  loading?: boolean
  variant?: 'danger' | 'primary'
}>(), {
  confirmLabel: 'Confirmar',
  cancelLabel: 'Cancelar',
  loadingLabel: 'Aguarde...',
  loading: false,
  variant: 'danger',
})

defineEmits<{ (e: 'confirm'): void }>()

const open = defineModel<boolean>({ required: true })
</script>
