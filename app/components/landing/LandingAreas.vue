<template>
  <section id="areas" class="lp-sec lp-raised" aria-labelledby="landing-areas">
    <div class="lp-wrap">
      <h2 id="landing-areas" class="lp-h2" data-reveal>Do edital à faculdade, do ENEM ao inglês.</h2>
      <p class="lp-lead" data-reveal>Escolha o que você estuda e veja como fica.</p>
      <!-- The 5 tabs wrap into lines on a phone: all of them reachable, no sideways scroll (prototype README) -->
      <div class="lp-area-tabs" role="tablist" aria-label="Áreas">
        <button
          v-for="(a, i) in AREAS"
          :id="`area-tab-${a.key}`"
          :key="a.key"
          ref="tabs"
          type="button"
          role="tab"
          :aria-controls="`area-panel-${a.key}`"
          :aria-selected="selected === a.key"
          :tabindex="selected === a.key ? 0 : -1"
          :data-testid="`landing-area-tab-${a.key}`"
          @click="selected = a.key"
          @keydown="onKey($event, i)"
        >
          <span class="dot" :class="a.dot" aria-hidden="true" />{{ a.name }}
        </button>
      </div>
      <div
        v-for="a in AREAS"
        :id="`area-panel-${a.key}`"
        :key="a.key"
        class="lp-area-panel"
        role="tabpanel"
        :aria-labelledby="`area-tab-${a.key}`"
        :hidden="selected !== a.key"
      >
        <div>
          <p class="pain">{{ a.pain }}</p>
          <ul>
            <li v-for="[lead, rest] in a.points" :key="lead">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7" /></svg>
              <span><b>{{ lead }}</b> {{ rest }}</span>
            </li>
          </ul>
          <div class="lp-act">
            <LandingCta to="/criar-conta" position="areas" :area="a.key" section>{{ a.cta }}</LandingCta>
            <span class="lp-fine" data-testid="landing-ai-areas">{{ landingAiLine(catalog) }}</span>
          </div>
        </div>
        <div class="lp-area-media">
          <LandingPhone><LandingScreen :name="a.screen" /></LandingPhone>
          <p class="lp-fine lp-demo-note">Conta de demonstração, com conteúdo de exemplo.</p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
// The areas (prd-landing-d RF-D8): one open at a time, each with the pain, what the app does, a real review screen
// and its own call. Tabs by the WAI-ARIA pattern: roving tabindex, arrows, Home and End. Every panel is in the HTML.
// Every area sells some AI (questões, PDF, photo): the line under the call says where it is.
import type { PlanCatalog } from '~/types'
import { AREAS, landingAiLine, type LandingArea } from '~/utils/landing'

defineProps<{ catalog: PlanCatalog | null }>()

const selected = ref<LandingArea>(AREAS[0].key)
const tabs = ref<HTMLButtonElement[]>([])

function onKey(ev: KeyboardEvent, i: number) {
  const last = AREAS.length - 1
  const next = ev.key === 'ArrowRight' ? (i + 1) % AREAS.length
    : ev.key === 'ArrowLeft' ? (i - 1 + AREAS.length) % AREAS.length
      : ev.key === 'Home' ? 0
        : ev.key === 'End' ? last
          : null
  if (next === null) return
  ev.preventDefault()
  selected.value = AREAS[next]!.key
  tabs.value[next]?.focus()
}
</script>
