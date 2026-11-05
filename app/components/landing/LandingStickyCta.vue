<template>
  <Transition
    enter-from-class="translate-y-full"
    leave-to-class="translate-y-full"
    enter-active-class="transition-transform duration-nav ease-calm motion-reduce:transition-none"
    leave-active-class="transition-transform duration-nav ease-calm motion-reduce:transition-none"
  >
    <div v-if="visible" class="fixed inset-x-0 bottom-0 z-sticky border-t border-line bg-raised pb-safe-bottom shadow-float md:hidden" data-ds-scope data-testid="landing-sticky-cta">
      <div class="px-gutter py-3">
        <UiButton variant="primary" block to="/criar-conta" @click="emit('cta')">Criar conta grátis</UiButton>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
// The action in the thumb zone (prd-landing-v4 RF-L10), phone only: the page shows it when the hero's action has
// left the screen and the final one has not arrived, and never over the consent banner.
defineProps<{ visible: boolean }>()
const emit = defineEmits<{ cta: [] }>()
</script>
