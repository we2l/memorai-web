<template>
  <div class="baigi-mascot" :class="[`baigi--${state}`, { 'baigi--visible': visible }]">
    <picture class="baigi-art">
      <source :srcset="art.avif" type="image/avif">
      <img
        :src="art.webp"
        alt=""
        aria-hidden="true"
        :width="width"
        :height="size"
        decoding="async"
        :loading="priority ? 'eager' : 'lazy'"
        draggable="false"
        class="baigi-img"
      >
    </picture>
  </div>
</template>

<script setup lang="ts">
// The official mascot (app/assets/mascots, the same art of UiLogo and the landing) in place of the old SVG dolphin.
// Each state picks a pose; `size` is the HEIGHT of the art (the poses are portrait, so the width is smaller than the
// old square box and no caller grows sideways):
//   idle, subtle -> mascot-baigi (the standing one with the light bulb; subtle is only quieter)
//   thinking     -> mascot-baigi-thinking (fin on the chin)
//   celebrating  -> mascot-baigi-celebrating
//   pose="podcast" (optional, the mini-player) -> mascot-baigi-podcast, whatever the state
// The images are never inlined (nuxt.config assetsInlineLimit) nor precached (no avif/webp in globPatterns).
import standingAvif from '~/assets/mascots/mascot-baigi.avif'
import standingWebp from '~/assets/mascots/mascot-baigi.webp'
import thinkingAvif from '~/assets/mascots/mascot-baigi-thinking.avif'
import thinkingWebp from '~/assets/mascots/mascot-baigi-thinking.webp'
import celebratingAvif from '~/assets/mascots/mascot-baigi-celebrating.avif'
import celebratingWebp from '~/assets/mascots/mascot-baigi-celebrating.webp'
import podcastAvif from '~/assets/mascots/mascot-baigi-podcast.avif'
import podcastWebp from '~/assets/mascots/mascot-baigi-podcast.webp'

type Pose = 'standing' | 'thinking' | 'celebrating' | 'podcast'

const POSES: Record<Pose, { avif: string, webp: string, w: number, h: number }> = {
  standing: { avif: standingAvif, webp: standingWebp, w: 256, h: 400 },
  thinking: { avif: thinkingAvif, webp: thinkingWebp, w: 192, h: 311 },
  celebrating: { avif: celebratingAvif, webp: celebratingWebp, w: 224, h: 262 },
  podcast: { avif: podcastAvif, webp: podcastWebp, w: 224, h: 263 },
}

const props = withDefaults(defineProps<{
  size?: number
  state?: 'idle' | 'thinking' | 'celebrating' | 'subtle'
  visible?: boolean
  /** Overrides the pose of the state (the mini-player shows the one with headphones) */
  pose?: 'podcast'
  /** Above the fold on its screen: load right away instead of lazily */
  priority?: boolean
}>(), {
  size: 64,
  state: 'idle',
  visible: true,
  pose: undefined,
  priority: false,
})

const art = computed(() => {
  if (props.pose) return POSES[props.pose]
  if (props.state === 'thinking') return POSES.thinking
  if (props.state === 'celebrating') return POSES.celebrating
  return POSES.standing
})
const width = computed(() => Math.round(props.size * art.value.w / art.value.h))
</script>

<style scoped>
.baigi-mascot {
  opacity: 0;
  transform: translateY(8px);
  transition: opacity 0.4s ease, transform 0.4s ease;
}

.baigi-mascot.baigi--visible {
  opacity: 1;
  transform: translateY(0);
}

.baigi-art {
  display: block;
}

.baigi-img {
  display: block;
  max-width: none;
  object-fit: contain;
  user-select: none;
  pointer-events: none;
}

/* Idle: breathing */
.baigi--idle .baigi-img {
  animation: baigi-breathe 3s ease-in-out infinite;
}

/* Thinking: slight tilt */
.baigi--thinking .baigi-img {
  animation: baigi-think 2s ease-in-out infinite;
  transform-origin: 50% 90%;
}

/* Celebrating: one high bounce */
.baigi--celebrating .baigi-img {
  animation: baigi-celebrate 1.2s ease-out;
}

/* Subtle: slower breathing, quieter */
.baigi--subtle .baigi-img {
  animation: baigi-breathe 4s ease-in-out infinite;
  opacity: 0.85;
}

@media (prefers-reduced-motion: reduce) {
  .baigi-mascot {
    transition: opacity 0.2s ease;
    transform: none;
  }

  .baigi-mascot .baigi-img {
    animation: none;
  }
}

@keyframes baigi-breathe {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-2px); }
}

@keyframes baigi-think {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(-3deg); }
  75% { transform: rotate(3deg); }
}

@keyframes baigi-celebrate {
  0% { transform: translateY(0) scale(1) rotate(0deg); }
  15% { transform: translateY(-25px) scale(1.15) rotate(-5deg); }
  30% { transform: translateY(-40px) scale(1.2) rotate(5deg); }
  45% { transform: translateY(-35px) scale(1.15) rotate(-3deg); }
  60% { transform: translateY(-20px) scale(1.1) rotate(3deg); }
  75% { transform: translateY(-10px) scale(1.05) rotate(-2deg); }
  90% { transform: translateY(-3px) scale(1.02) rotate(0deg); }
  100% { transform: translateY(0) scale(1) rotate(0deg); }
}
</style>
