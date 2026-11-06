<template>
  <UiSheet
    :model-value="open"
    title="Tocando agora"
    :side="desktop ? 'right' : 'bottom'"
    size="lg"
    @update:model-value="(v: boolean) => { if (!v) player.collapse() }"
  >
    <PodcastPlayerPanel />
  </UiSheet>
</template>

<script setup lang="ts">
// The expanded player (prd-4e-praticar-v3 RF-F7): the same panel as the /podcasts column, in a sheet from the
// bottom on the phone and from the right on the desktop, opened by the mini-player from anywhere in the app.
// UiSheet brings the focus trap, Esc and the scroll lock. On /podcasts (desktop) the panel already sits in
// the page: the sheet stays closed there.
const player = usePlayerStore()
const route = useRoute()
const desktop = useMediaQuery('(min-width: 1024px)')
const open = computed(() => player.expanded && !!player.currentPodcast && !(desktop.value && route.path === '/podcasts'))
</script>
