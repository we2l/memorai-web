<template>
  <section class="lp-sec lp-raised lp-proj" aria-labelledby="landing-projection">
    <div class="lp-wrap">
      <div>
        <h2 id="landing-projection" data-reveal>Saiba quanto você vai lembrar no dia da prova.</h2>
        <p class="lp-lead" data-reveal>Marque a data. A cada revisão o Baigi refaz a conta com os seus cards: um número se você mantiver o ritmo, outro se parar hoje.</p>
        <p class="lp-how" data-reveal><b>Como calculamos:</b> cada card tem uma força que sobe quando você acerta e cai com o tempo; a conta soma todas no dia da prova.</p>
        <div class="lp-act">
          <LandingCta to="/criar-conta" position="projection" section>Marcar a data da minha prova</LandingCta>
        </div>
      </div>
      <div>
        <div class="lp-proof" data-reveal="scale">
          <div class="n">
            <b class="num"><span :data-count="demo.keep_pace" data-suffix="%" data-ms="1600" @counted="celebrate">{{ demo.keep_pace }}%</span></b>
            <span>mantendo o ritmo</span>
          </div>
          <LandingPhone><LandingScreen name="hoje-tela" /></LandingPhone>
          <div class="n">
            <b class="num"><span :data-count="demo.stop_today" data-suffix="%" data-ms="1600">{{ demo.stop_today }}%</span></b>
            <span>se parar hoje</span>
          </div>
          <LandingMascot :pose="celebrating ? 'celebrating' : 'thinking'" class="lp-proj-m" :class="{ 'lp-pop': celebrating }" />
        </div>
        <p class="lp-fine lp-proj-note">{{ demo.exam }}, daqui a {{ demo.days }} dias, na conta de demonstração.</p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
// The projection (prd-landing-d RF-D6): 90% and 75% in huge type around the real Hoje, the same numbers of the demo
// account (demo.json, written by e2e/landing/shots.ts). The dolphin swaps to the celebrating pose when 90% lands.
import demo from '~/assets/landing/demo.json'

const celebrating = ref(false)
function celebrate() {
  celebrating.value = true
}
</script>
