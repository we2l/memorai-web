<template>
  <figure class="flex flex-col items-center gap-2" data-testid="podcast-demo">
    <!-- A screen recording of the player, muted and without sound to hear: preload none (nothing downloads
         before the play), outside the PWA precache (public/demo is not in its globPatterns), no autoplay -->
    <video
      :key="colorMode"
      class="h-auto w-full rounded-card border border-line bg-soft"
      :class="compact ? 'max-w-32' : 'max-w-44'"
      width="390"
      height="844"
      :poster="`/demo/podcast-${colorMode}-poster.jpg`"
      preload="none"
      muted
      playsinline
      controls
      :aria-describedby="captionId"
      data-testid="podcast-demo-video"
    >
      <source :src="`/demo/podcast-${colorMode}.webm`" type="video/webm">
      <source :src="`/demo/podcast-${colorMode}.mp4`" type="video/mp4">
    </video>
    <figcaption :id="captionId" class="max-w-xs text-center text-label text-fg-muted">
      Demonstração sem som: o episódio dos seus erros tocando, com a transcrição e os cards para revisar depois.
    </figcaption>
  </figure>
</template>

<script setup lang="ts">
// The podcast paywall's demo (prd-planos-lancamento RF-F3): who is not on the paid plan (Free and the trial)
// sees what the episode is instead of generating one. Light or dark recording by the app's theme.
defineProps<{ compact?: boolean }>()

const { colorMode } = useColorMode()
const captionId = useId()
</script>
