<template>
  <section id="esquecer" class="lp-curve-sec lp-band" aria-labelledby="landing-curve">
    <LandingMascot pose="thinking" class="lp-curve-m lp-float" data-reveal="scale" />
    <div class="lp-wrap">
      <h2 id="landing-curve" data-reveal>Sem revisão, a curva só desce.</h2>
      <p class="lp-lead" data-reveal style="--d: 100ms">
        Você lê, entende, e em poucos dias a maior parte já sumiu. Revisar no dia certo segura a curva lá em cima. O difícil é saber qual é o dia certo de cada card. Isso o Baigi calcula.
      </p>
      <div class="lp-curve" data-reveal>
        <svg viewBox="0 0 1000 300" role="img" aria-label="Ilustração: sem revisar, a lembrança cai rápido; revisando no dia certo, ela cai menos e volta a subir a cada revisão.">
          <line class="axis" x1="0" y1="280" x2="1000" y2="280" stroke-width="2" />
          <path class="forget" d="M0 30 C 80 150, 180 220, 340 245 S 700 268, 1000 272" fill="none" stroke-width="6" stroke-linecap="round" />
          <path class="review" d="M0 30 C 40 80, 80 100, 130 108 L 130 34 C 190 70, 260 86, 330 92 L 330 34 C 430 60, 530 72, 610 76 L 610 34 C 740 54, 880 62, 1000 64" fill="none" stroke-width="6" stroke-linejoin="round" stroke-linecap="round" />
          <g font-size="20"><text x="0" y="304">hoje</text><text x="1000" y="304" text-anchor="end">dia da prova</text></g>
          <rect class="cover" x="0" y="0" width="1010" height="282" />
        </svg>
        <div class="lp-legend">
          <span><i class="forget" />sem revisar</span>
          <span><i class="review" />revisando no dia certo</span>
          <span class="lp-fine">Ilustração da ideia, sem escala. A conta de verdade usa os seus cards.</span>
        </div>
      </div>
      <div class="lp-act">
        <LandingCta to="/criar-conta" position="curve" tone="band" section>Começar a revisar grátis</LandingCta>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
// The villain (prd-landing-d RF-D3): the forgetting curve on the deep violet band, drawn when it shows up (a cover
// that slides away, transform only), the thinking dolphin, and its own call. An illustration of the idea, no scale.
</script>
