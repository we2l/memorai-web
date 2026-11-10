<template>
  <section id="podcast" class="lp-sec lp-pod-sec" aria-labelledby="landing-podcast">
    <div class="lp-wrap lp-split">
      <div>
        <h2 id="landing-podcast" class="lp-h2" data-reveal>Revise no ônibus, na academia, na caminhada.</h2>
        <p class="lp-lead" data-reveal>O que você mais erra vira um episódio curto. O Baigi faz a pergunta, espera você lembrar e dá a resposta. Sem olhar para a tela.</p>
        <!-- Where people listen: the time that is already there, eyes and hands busy -->
        <ul class="lp-chips" data-reveal aria-label="Outros momentos para ouvir">
          <li><span>No carro</span></li><li><span>Na fila</span></li><li><span>Lavando a louça</span></li>
        </ul>
        <div class="lp-act">
          <button type="button" class="lp-btn lp-btn-band" data-cta data-testid="landing-cta-podcast" @click="listen">Ouvir um exemplo</button>
          <NuxtLink to="/comecar" class="lp-link" data-testid="landing-cta-podcast-signup" @click="track?.('podcast')">ou começar grátis</NuxtLink>
        </div>
        <p class="lp-pod-plan" data-testid="landing-podcast-plan">{{ landingPodcastLine(catalog) }}</p>
      </div>
      <div ref="box" class="lp-podbox" data-reveal="scale">
        <LandingMascot pose="podcast" class="lp-pod-m" :class="playing ? 'lp-bob' : 'lp-float'" />
        <LandingPlayer ref="player" :catalog="catalog" @playing="playing = $event" @first-play="emit('sample')" />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
// The podcast (prd-landing-d RF-D7): where it is heard (bus, gym, walk), the petrol band, the dolphin with headphones over the player of the real
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
