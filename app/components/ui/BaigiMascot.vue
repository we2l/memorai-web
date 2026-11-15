<template>
  <div class="baigi-mascot" :class="[`baigi--${state}`, { 'baigi--visible': visible }]">
    <img
      :src="`/mascote/${art}.svg`"
      alt=""
      aria-hidden="true"
      :width="width"
      :height="size"
      decoding="async"
      :loading="priority ? 'eager' : 'lazy'"
      draggable="false"
      class="baigi-img"
    >
  </div>
</template>

<script setup lang="ts">
// The mascot: one static SVG per expression (public/mascote/<estado>.svg), drawn from the rig in app/assets/mascote by
// scripts/mascote-svgs.mjs. An <img>: no script, no clash of ids between two dolphins on a page, sharp at any size,
// outside the route budgets and the precache (globIgnores mascote/**). `size` is the HEIGHT of the art; the width
// comes from the expression's own box (estados.json).
//   idle, subtle -> neutro (subtle is only quieter)
//   thinking     -> pensando
//   celebrating  -> confete (comemorando below 80 px, where the confetti would shrink the dolphin)
//   pose="podcast" (the mini-player) -> ouvindo, whatever the state
//   expression   -> any expression of the rig (feliz, preocupado, acenando…), over the state
import sizes from '~/assets/mascote/estados.json'

export type MascotExpression = keyof typeof sizes

const props = withDefaults(defineProps<{
  size?: number
  state?: 'idle' | 'thinking' | 'celebrating' | 'subtle'
  visible?: boolean
  /** Overrides the pose of the state (the mini-player shows the one with headphones) */
  pose?: 'podcast'
  /** Any expression of the rig, over the state and the pose */
  expression?: MascotExpression
  /** Above the fold on its screen: load right away instead of lazily */
  priority?: boolean
}>(), {
  size: 64,
  state: 'idle',
  visible: true,
  pose: undefined,
  expression: undefined,
  priority: false,
})

const art = computed<MascotExpression>(() => {
  if (props.expression) return props.expression
  if (props.pose === 'podcast') return 'ouvindo'
  if (props.state === 'thinking') return 'pensando'
  if (props.state === 'celebrating') return props.size >= 80 ? 'confete' : 'comemorando'
  return 'neutro'
})
const width = computed(() => Math.round(props.size * sizes[art.value].w / sizes[art.value].h))
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
