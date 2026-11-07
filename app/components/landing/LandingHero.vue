<template>
  <section class="lp-hero" aria-labelledby="landing-title">
    <div class="lp-wrap">
      <div class="lp-text">
        <h1 id="landing-title">
          <span v-for="v in HERO_VARIANTS" :key="v.key" :data-m-variant="v.key">
            <span v-for="(line, i) in v.lines" :key="line" class="ln" :style="{ '--d': `${60 + 140 * i}ms` }">
              <template v-for="part in titleParts(line)" :key="part.text">
                <span v-if="part.mark" class="lp-grifo">{{ part.text }}</span>
                <template v-else>{{ part.text }}</template>
              </template>
            </span>
          </span>
          <span class="lp-tag" aria-hidden="true">golfinho não é peixe</span>
        </h1>
        <p class="lp-lead fade" style="--d: 600ms">
          <span v-for="v in HERO_VARIANTS" :key="v.key" :data-m-variant="v.key">{{ v.lead }}</span>
        </p>
        <div class="lp-hero-cta fade" style="--d: 760ms">
          <LandingCta to="/criar-conta" position="hero" section>Criar conta grátis</LandingCta>
          <span class="lp-fine">
            <span v-for="v in HERO_VARIANTS" :key="v.key" :data-m-variant="v.key">{{ v.ai ? `Sem cartão. Revisar é grátis pra sempre. ${landingAiLine(catalog)}` : 'Sem cartão. A revisão é grátis pra sempre.' }}</span>
          </span>
        </div>
      </div>

      <div class="lp-scene">
        <LandingPhone>
          <div v-for="v in HERO_VARIANTS" :key="v.key" :data-m-variant="v.key" class="lp-fill">
            <LandingClip v-if="'clip' in v.media" :clip="v.media.clip" :priority="v.key === 'padrao'" />
            <LandingScreen v-else :name="v.media.screen" />
          </div>
        </LandingPhone>
        <div class="lp-hero-m">
          <LandingMascot pose="standing" eager class="lp-float" />
        </div>
        <!-- The dolphin's line: the tail points at it (owner, 06/11: every bubble comes from the dolphin) -->
        <p class="lp-bubble">
          <span v-for="v in HERO_VARIANTS" :key="v.key" :data-m-variant="v.key">{{ v.bubble }}</span>
        </p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
// Hero of the landing D (prd-landing-d RF-D2, RF-D13): "Chega de memória de peixe." with "peixe" under the lilac
// highlighter and the "golfinho não é peixe" sticker, the real app tilted in a phone, the dolphin in front of it
// saying the line of the demo account. Every `?m=` variant is in the HTML; landing.css shows the one of html[data-m].
// The entrance moves the <h1> and the phone with transform only: they are the LCP candidates and paint at once.
// The variants that sell the AI (PDF, photo) say under the call where it is: the Free plan has none.
import type { PlanCatalog } from '~/types'
import { HERO_VARIANTS, landingAiLine, titleParts } from '~/utils/landing'

defineProps<{ catalog: PlanCatalog | null }>()
</script>
