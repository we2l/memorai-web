<template>
  <div class="min-h-dvh bg-raised">
    <slot />
    <ShellToastHost />
  </div>
</template>

<script setup lang="ts">
// Shell of the landing v4 (prd-landing-v4 RF-L1): the page brings its own header (sticky on the desktop, with the
// action that follows the hero) and the public footer. No BottomNav: data-chrome tells the shell measures of
// tokens.css (toast) that nothing sits under them, as in layouts/public.vue.
onMounted(() => { document.documentElement.dataset.chrome = 'public' })
onBeforeUnmount(() => { delete document.documentElement.dataset.chrome })
</script>
