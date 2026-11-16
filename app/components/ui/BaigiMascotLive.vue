<template>
  <span class="baigi-live" :style="{ height: `${size}px`, width: `${width}px` }" :data-expression="expression" aria-hidden="true">
    <!-- The static picture of the expression until the rig loads, and for good with reduced motion -->
    <img v-if="!html" :src="`/mascote/${expression}.svg`" alt="" :width="width" :height="size" decoding="async" class="baigi-live-img">
    <span v-else ref="host" class="baigi-live-svg" v-html="html" />
  </span>
</template>

<script setup lang="ts">
// The mascot that moves: the rig of app/assets/mascote drawn frame by frame. Only where the design system lets the
// dolphin react (ADR-035: the feedback strip of the review). It goes from `from` to `expression` in TRANSITION_MS,
// breathes and blinks, and stops after LIVE_MS on the last frame: a reaction, never a loop on a screen of
// continuous use. With prefers-reduced-motion it stays the static picture. The art, the states and the rig come in
// one lazy chunk, loaded once; before that, the static file of the expression is on screen (no jump).
import sizes from '~/assets/mascote/estados.json'
import cuts from '~/assets/mascote/recortes.json'
import type { MascotExpression } from '~/components/ui/BaigiMascot.vue'

const props = withDefaults(defineProps<{
  expression: MascotExpression
  from?: MascotExpression
  size?: number
}>(), { from: 'neutro', size: 58 })

const TRANSITION_MS = 420
const LIVE_MS = 3000

type Rig = { desenhar: (root: SVGSVGElement, q: Record<string, unknown>) => void }
interface Kit { svg: string, states: Record<string, Record<string, unknown>>, rig: Rig }

const html = ref('')
const host = ref<HTMLElement | null>(null)
const width = computed(() => Math.round(props.size * sizes[props.expression].w / sizes[props.expression].h))

let kit: Promise<Kit> | null = null
let instance = 0
function loadKit(): Promise<Kit> {
  kit ??= Promise.all([
    import('~/assets/mascote/mascote.svg?raw'),
    import('~/assets/mascote/mascote.json'),
    import('~/assets/mascote/rig.js'),
  ]).then(([svg, json, rig]) => ({ svg: svg.default, states: json.default.estados, rig: rig.MASCOTE as Rig }))
  return kit
}

/** Two dolphins on one page share no id: clip paths and <use> point to the copy's own defs. */
function ownIds(svg: string, n: number): string {
  const ids = [...svg.matchAll(/\sid="([^"]+)"/g)].map(m => m[1])
  let out = svg
  for (const id of ids) {
    out = out
      .replaceAll(`id="${id}"`, `id="${id}-m${n}"`)
      .replaceAll(`url(#${id})`, `url(#${id}-m${n})`)
      .replaceAll(`href="#${id}"`, `href="#${id}-m${n}"`)
  }
  return out
}

let frame = 0
let started = 0
const sm = (x: number) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x) }

function play(k: Kit) {
  const root = host.value?.querySelector('svg') as SVGSVGElement | null
  if (!root) return
  const vb = cuts[props.expression]
  root.setAttribute('viewBox', vb.join(' '))
  root.removeAttribute('width')
  root.removeAttribute('height')
  const de = k.states[props.from] ?? {}
  const para = k.states[props.expression] ?? {}
  const seed = instance
  cancelAnimationFrame(frame)
  started = performance.now()
  const tick = (now: number) => {
    const ms = now - started
    const t = 2.55 + Math.min(ms, LIVE_MS) / 1000
    k.rig.desenhar(root, { t, de, para, p: sm(ms / TRANSITION_MS), fala: null, olhar: null, semente: seed })
    if (ms < LIVE_MS && !document.hidden) frame = requestAnimationFrame(tick)
  }
  frame = requestAnimationFrame(tick)
}

async function start() {
  if (import.meta.server || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const k = await loadKit().catch(() => null)
  if (!k) return
  if (!html.value) html.value = ownIds(k.svg, ++instance)
  await nextTick()
  play(k)
}

watch(() => [props.expression, props.from], () => { void start() })
onMounted(() => { void start() })
onBeforeUnmount(() => cancelAnimationFrame(frame))
</script>

<style scoped>
.baigi-live { display: inline-block; position: relative; }
.baigi-live-img { display: block; width: 100%; height: 100%; object-fit: contain; user-select: none; }
.baigi-live-svg, .baigi-live-svg :deep(svg) { display: block; width: 100%; height: 100%; overflow: visible; }
</style>
