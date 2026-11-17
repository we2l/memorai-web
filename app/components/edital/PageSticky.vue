<template>
  <!-- The bar of the phone (< 768 px, RF-W5 item 8): after the Situação box leaves the screen, gone while the actions
       are on it. One fixed bar: the public layout has no bottom navigation -->
  <Transition enter-from-class="translate-y-full opacity-0" leave-to-class="translate-y-full opacity-0" enter-active-class="transition duration-base ease-out" leave-active-class="transition duration-fast ease-out">
    <div v-if="visible" class="edital-sticky fixed inset-x-0 bottom-0 z-sticky bg-raised px-gutter pt-3 shadow-float md:hidden" data-testid="edital-page-sticky">
      <UiButton variant="primary" block :loading="applying" data-testid="edital-page-sticky-apply" @click="emit('apply')">Estudar isso no Baigi</UiButton>
    </div>
  </Transition>
</template>

<script setup lang="ts">
defineProps<{ visible: boolean, applying?: boolean }>()
const emit = defineEmits<{ (e: 'apply'): void }>()
</script>

<style scoped>
.edital-sticky { padding-bottom: max(0.75rem, env(safe-area-inset-bottom)); }
</style>
