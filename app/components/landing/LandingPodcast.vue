<template>
  <section id="podcast" class="lp-sec lp-pod-sec" aria-labelledby="landing-podcast">
    <div class="lp-wrap lp-split">
      <div>
        <h2 id="landing-podcast" class="lp-h2" data-reveal>E o que você mais erra vira podcast.</h2>
        <p class="lp-lead" data-reveal>O Baigi faz a pergunta, espera você pensar e dá a resposta. Episódio curto, feito dos seus cards, pra ouvir com as mãos ocupadas.</p>
        <p class="lp-chips" data-reveal><span>Errou no simulado</span>›<span>virou card</span>›<span>virou episódio</span></p>
        <div class="lp-act">
          <button type="button" class="lp-btn lp-btn-band" data-cta data-testid="landing-cta-podcast" @click="listen">Ouvir um exemplo</button>
          <NuxtLink to="/criar-conta" class="lp-link" data-testid="landing-cta-podcast-signup" @click="track?.('podcast')">ou criar conta grátis</NuxtLink>
        </div>
        <p class="lp-pod-plan" data-testid="landing-podcast-plan">{{ landingPodcastLine(catalog) }}</p>
      </div>
      <div ref="box" class="lp-podbox" data-reveal="scale">
        <LandingMascot pose="podcast" class="lp-pod-m" :class="playing ? 'lp-bob' : 'lp-float'" />
        <LandingPlayer ref="player" @playing="playing = $event" @first-play="emit('sample')" />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
// The podcast (prd-landing-d RF-D7): the petrol band, the dolphin with headphones over the player of the real
// sample, "Ouvir um exemplo" playing right there, and the plan line from the catalog (the paid plan's benefit; the
// trial leaves the podcast out).
import type { PlanCatalog } from '~/types'
import { LANDING_CTA, landingPodcastLine } from '~/utils/landing'
import type PlayerComponent from './LandingPlayer.vue'

defineProps<{ catalog: PlanCatalog | null }>()
const emit = defineEmits<{ sample: [] }>()

const track = inject(LANDING_CTA, null)
const playing = ref(false)
const box = ref<HTMLElement | null>(null)
const player = ref<InstanceType<typeof PlayerComponent> | null>(null)

function listen() {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  box.value?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' })
  player.value?.play()
}
</script>
