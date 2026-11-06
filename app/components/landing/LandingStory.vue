<template>
  <section id="como" class="lp-story" aria-labelledby="landing-how">
    <div class="lp-wrap">
      <h2 id="landing-how" class="lp-h2" data-reveal>Do PDF à revisão de hoje.</h2>
    </div>
    <div class="lp-wrap lp-story-in">
      <div>
        <article v-for="s in STORY" :key="s.key" ref="chapters" class="lp-chap" :data-step="s.key" :data-active="String(active === s.key)">
          <span class="n">{{ s.step }}</span>
          <h3>{{ s.title }}</h3>
          <p class="lp-lead">{{ s.text }}</p>
          <!-- Phone: each chapter brings its own clip (no fixed stage under 1024 px) -->
          <div class="inline-media">
            <LandingPhone><LandingClip :clip="s.clip" /></LandingPhone>
          </div>
          <div class="lp-act">
            <LandingCta to="/criar-conta" :position="s.position" section>{{ s.cta }}</LandingCta>
          </div>
        </article>
      </div>
      <!-- Desktop: the phone stays and the screen changes with the chapter in the middle of the screen -->
      <div class="lp-sticky-col" aria-hidden="true">
        <div ref="stage" class="lp-stage">
          <LandingPhone>
            <div v-for="s in STORY" :key="s.key" class="lp-layer" :data-on="String(active === s.key)" :data-layer="s.key">
              <LandingClip :clip="s.clip" :auto="false" />
            </div>
          </LandingPhone>
          <LandingMascot :pose="pose" class="lp-guide" :class="{ 'lp-pop': popKey > 0 }" :data-pop="popKey" />
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
// "Como funciona" (prd-landing-d RF-D4; the stage of the B direction): only material and review (owner, 06/11), the
// quiz and the podcast have their own sections. On the desktop the chapter in the middle of the screen picks the
// layer of the fixed phone (and plays only that clip, with motion allowed) and the dolphin's pose; the other chapter
// turns grey, never transparent (its text keeps 4.5:1).
import { STORY } from '~/utils/landing'
import { motionAllowed, playClip } from '~/utils/landingMotion'

type StoryKey = typeof STORY[number]['key']
const active = ref<StoryKey>(STORY[0].key)
const pose = computed(() => STORY.find(s => s.key === active.value)!.pose)
const popKey = ref(0)
const chapters = ref<HTMLElement[]>([])
const stage = ref<HTMLElement | null>(null)

let chaptersIo: IntersectionObserver | null = null
let stageIo: IntersectionObserver | null = null
let stageOnScreen = false

function syncClips() {
  if (!stage.value) return
  for (const video of stage.value.querySelectorAll<HTMLVideoElement>('video[data-clip]')) {
    const on = stageOnScreen && video.closest('[data-layer]')?.getAttribute('data-layer') === active.value
    if (on && motionAllowed()) {
      video.currentTime = 0
      playClip(video)
    }
    else video.pause()
  }
}

onMounted(() => {
  if (!('IntersectionObserver' in window) || !window.matchMedia('(min-width: 1024px)').matches) return
  chaptersIo = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue
      const key = (e.target as HTMLElement).dataset.step as StoryKey
      if (key === active.value) continue
      active.value = key
      if (motionAllowed()) popKey.value++
      syncClips()
    }
  }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 })
  for (const c of chapters.value) chaptersIo.observe(c)
  stageIo = new IntersectionObserver(([e]) => {
    stageOnScreen = !!e?.isIntersecting
    syncClips()
  }, { threshold: 0.35 })
  if (stage.value) stageIo.observe(stage.value)
})
onBeforeUnmount(() => {
  chaptersIo?.disconnect()
  stageIo?.disconnect()
})
</script>
