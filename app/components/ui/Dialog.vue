<template>
  <Teleport to="body">
    <Transition
      :enter-active-class="motion.active"
      :enter-from-class="motion.from"
      :leave-active-class="motion.active"
      :leave-to-class="motion.from"
    >
      <div
        v-if="modelValue"
        class="fixed inset-0 z-overlay flex bg-scrim"
        :class="[LAYOUT[placement].scrim, size === 'xl' && placement === 'center' && 'max-sm:p-0']"
        @click.self="dismiss"
      >
        <div
          ref="panel"
          :role="role"
          aria-modal="true"
          :aria-labelledby="titleId"
          :aria-describedby="description ? descriptionId : undefined"
          class="flex w-full flex-col overflow-hidden bg-float text-fg shadow-float"
          :class="[LAYOUT[placement].panel, placement === 'right' ? 'sm:max-w-md' : SIZES[size]]"
        >
          <span v-if="placement === 'bottom'" class="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-line-strong" aria-hidden="true" />
          <div class="flex items-start gap-3 px-5 pb-3 pt-4 sm:px-6 sm:pt-5">
            <div class="min-w-0 flex-1">
              <h2 :id="titleId" class="text-section text-fg-strong">{{ title }}</h2>
              <p v-if="description" :id="descriptionId" class="mt-1 text-meta text-fg-muted">{{ description }}</p>
            </div>
            <UiIconButton v-if="dismissible" :icon="X" label="Fechar" size="sm" data-modal-close="1" class="-mr-2" @click="close" />
          </div>
          <div class="min-h-0 flex-1 overflow-y-auto px-5 pb-5 sm:px-6">
            <slot :close="close" />
          </div>
          <div v-if="$slots.footer" class="flex flex-wrap items-center justify-end gap-2 border-t border-line px-5 py-3 sm:px-6">
            <slot name="footer" :close="close" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
// Dialog (raio-X §D, tasks 12.1): title, description, body and footer with tokens. The layer behaviour
// (Esc on the topmost, scroll lock, focus trap and return) comes from useModalLayer.
// `placement` is how UiSheet reuses it (bottom/right); a dialog is its own screen for the
// "one primary" rule (useScopedLimit). The only place allowed to use `fixed inset-0`.
import { X } from 'lucide-vue-next'

export type DialogPlacement = 'center' | 'bottom' | 'right'

const props = withDefaults(defineProps<{
  modelValue: boolean
  title: string
  description?: string
  /** xl: wide reading (the PDF), the whole screen on the phone */
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** false: no close button, Esc and the backdrop do nothing (a decision is required) */
  dismissible?: boolean
  role?: 'dialog' | 'alertdialog'
  placement?: DialogPlacement
}>(), { description: undefined, size: 'md', dismissible: true, role: 'dialog', placement: 'center' })

const emit = defineEmits<{ (e: 'update:modelValue', value: boolean): void }>()

const panel = ref<HTMLElement | null>(null)
const titleId = useId()
const descriptionId = `${titleId}-desc`

const SIZES = { sm: 'sm:max-w-sm', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl', xl: 'h-full sm:h-auto sm:max-w-5xl' }
const LAYOUT: Record<DialogPlacement, { scrim: string; panel: string }> = {
  center: { scrim: 'items-center justify-center p-4', panel: 'max-h-full rounded-float' },
  bottom: { scrim: 'items-end justify-center', panel: 'max-h-9/10 rounded-t-float pb-safe-bottom' },
  right: { scrim: 'justify-end', panel: 'h-full' },
}
// One fade (200 ms, --motion-respond) for the backdrop and the panel together: cheap in CSS and calm
const motion = { active: 'transition-opacity duration-respond ease-calm', from: 'opacity-0' }

function close() {
  emit('update:modelValue', false)
}

function dismiss() {
  if (props.dismissible) close()
}

useModalLayer({ open: () => props.modelValue, panel, onEscape: dismiss })
</script>
