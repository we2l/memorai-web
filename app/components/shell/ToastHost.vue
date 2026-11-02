<template>
  <Teleport to="body">
    <div class="pointer-events-none fixed inset-x-4 bottom-toast z-toast flex flex-col gap-2 lg:inset-x-auto lg:bottom-auto lg:right-4 lg:top-4 lg:w-96">
      <!-- Two live regions always mounted: polite for success/info, assertive for error/warning -->
      <div v-for="region in REGIONS" :key="region.role" :role="region.role" :aria-live="region.live" class="flex flex-col gap-2">
        <TransitionGroup
          enter-active-class="transition duration-respond ease-calm"
          enter-from-class="translate-y-2 opacity-0"
          leave-active-class="transition duration-respond ease-calm"
          leave-to-class="translate-y-2 opacity-0"
        >
          <UiToast
            v-for="item in itemsOf(region.types)"
            :key="item.id"
            :message="item.message"
            :tone="item.type"
            :action="item.action ? { label: item.action.label } : undefined"
            @action="toast.runAction(item.id)"
            @dismiss="toast.dismiss(item.id)"
            @pause="toast.pause(item.id)"
            @resume="toast.resume(item.id)"
          />
        </TransitionGroup>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
// Toast host of the shell (ADR-027 §5, tasks 12.3): one per layout. z-toast and bottom-toast (above the
// bottom nav and the mini-player) come from the tokens; on desktop the stack goes to the top right.
import type { ToastType } from '~/composables/useToast'

const toast = useToast()

const REGIONS = [
  { role: 'status', live: 'polite', types: ['success', 'info'] as ToastType[] },
  { role: 'alert', live: 'assertive', types: ['error', 'warning'] as ToastType[] },
] as const

function itemsOf(types: readonly ToastType[]) {
  return toast.state.items.filter(i => types.includes(i.type))
}
</script>
