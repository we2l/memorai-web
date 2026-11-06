<template>
  <UiDialog v-model="open" size="sm" role="alertdialog" :title="title" :description="message">
    <slot />
    <UiInput v-if="requireText" :id="inputId" v-model="typed" class="mt-1" :label="`Digite ${requireText} para confirmar`" autocomplete="off" />
    <template #footer>
      <UiButton variant="ghost" @click="open = false">{{ cancelLabel }}</UiButton>
      <UiButton :variant="variant === 'primary' ? 'primary' : 'danger'" :loading="loading" :disabled="!textMatches" @click="$emit('confirm')">
        {{ loading ? loadingLabel : confirmLabel }}
      </UiButton>
    </template>
  </UiDialog>
</template>

<script setup lang="ts">
// Confirmation of a destructive or irreversible action, over UiDialog (role alertdialog). `requireText` asks for
// the name typed before enabling it (a caderno with 50 cards or more).
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
  loadingLabel: 'Aguarde…',
  loading: false,
  variant: 'danger',
  requireText: undefined,
})

defineEmits<{ (e: 'confirm'): void }>()

const open = defineModel<boolean>({ required: true })
const typed = ref('')
const inputId = useId()
const textMatches = computed(() => !props.requireText || typed.value.trim() === props.requireText.trim())

watch(open, (v) => { if (v) typed.value = '' })
</script>
