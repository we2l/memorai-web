<template>
  <Teleport to="body">
    <div class="toast-stack fixed z-[100] flex flex-col gap-2 pointer-events-none">
      <!-- Two live regions always mounted: polite for success/info, assertive for error/warning -->
      <div role="status" aria-live="polite" class="flex flex-col gap-2">
        <TransitionGroup name="toast">
          <UiToastItem
            v-for="item in politeItems"
            :key="item.id"
            :item="item"
          />
        </TransitionGroup>
      </div>
      <div role="alert" aria-live="assertive" class="flex flex-col gap-2">
        <TransitionGroup name="toast">
          <UiToastItem
            v-for="item in assertiveItems"
            :key="item.id"
            :item="item"
          />
        </TransitionGroup>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
const { state } = useToast()

const politeItems = computed(() => state.items.filter(i => i.type === 'success' || i.type === 'info'))
const assertiveItems = computed(() => state.items.filter(i => i.type === 'error' || i.type === 'warning'))
</script>

<style scoped>
.toast-stack {
  left: 1rem;
  right: 1rem;
  bottom: calc(var(--nav-h, 0px) + var(--miniplayer-h, 0px) + 12px + env(safe-area-inset-bottom));
}
@media (min-width: 1024px) {
  .toast-stack {
    left: auto;
    bottom: auto;
    top: 1rem;
    right: 1rem;
    width: 24rem;
  }
}
.toast-enter-active,
.toast-leave-active {
  transition: all 200ms ease-in-out;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
