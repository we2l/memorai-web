<template>
  <section class="lp-sec lp-raised lp-proj" aria-labelledby="landing-projection">
    <div class="lp-wrap">
      <div>
        <h2 id="landing-projection" data-reveal>Saiba o quanto você está pronto para a prova.</h2>
        <p class="lp-lead" data-reveal>Marque a data. O Baigi junta memória, revisões em dia e acerto em questões num número de 0 a 100 e mostra o que fazer para subir.</p>
        <p class="lp-how" data-reveal><b>Como calculamos:</b> metade é o quanto você vai lembrar no dia; o resto, revisões em dia e acerto em questões. Estima o seu preparo, não a aprovação.</p>
        <div class="lp-act">
          <LandingCta to="/comecar" position="projection" section>Marcar a data da minha prova</LandingCta>
        </div>
      </div>
      <div>
        <div class="lp-proof" data-reveal="scale">
          <div class="n">
            <b class="num"><span :data-count="demo.readiness.score" data-suffix="" data-ms="1600" @counted="celebrate">{{ demo.readiness.score }}</span></b>
            <span>de 100 de prontidão</span>
          </div>
          <LandingPhone><LandingScreen name="hoje-tela" /></LandingPhone>
          <div class="n">
            <b class="num"><span :data-count="demo.readiness.memory" data-suffix="%" data-ms="1600">{{ demo.readiness.memory }}%</span></b>
            <span>lembrando no dia</span>
          </div>
          <LandingMascot :pose="celebrating ? 'celebrating' : 'thinking'" class="lp-proj-m" :class="{ 'lp-pop': celebrating }" />
        </div>
        <p class="lp-fine lp-proj-note">{{ demo.exam }}, daqui a {{ demo.days }} dias, na conta de demonstração.</p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
// The readiness for the exam (prd-landing-d RF-D6, prd-prontidao-prova): the score and the memory part in huge type around
// the real Hoje, the same numbers of the demo account (demo.json, written by e2e/landing/shots.ts). Never a chance of
// passing (DD2). The dolphin swaps to the celebrating pose when the score lands.
import demo from '~/assets/landing/demo.json'

const celebrating = ref(false)
function celebrate() {
  celebrating.value = true
}
</script>
