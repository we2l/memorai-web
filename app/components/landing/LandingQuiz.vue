<template>
  <section id="simulado" class="lp-sec lp-quiz-sec" aria-labelledby="landing-quiz">
    <div class="lp-wrap lp-split">
      <div>
        <h2 id="landing-quiz" class="lp-h2" data-reveal>Errou no simulado? Melhor agora do que na prova.</h2>
        <p class="lp-lead" data-reveal>No fim você vê o acerto por assunto, e cada erro já vira card com o comentário da questão no verso. Desmarca o que não quiser.</p>
        <p class="lp-score num" data-reveal>
          <span data-count="70" data-suffix="%">70%</span>
          <small>7 de 10 em Fisiologia, +3 pontos em relação à última vez.</small>
        </p>
        <div class="lp-bars" data-reveal>
          <div>Sistema cardiovascular · 4 de 6<span class="bar" style="--v: .67" /></div>
          <div>Sistema respiratório · 3 de 4<span class="bar" style="--v: .75" /></div>
        </div>
        <p class="lp-fine lp-demo-note" data-testid="landing-demo-quiz">Números e tela da conta de demonstração, com conteúdo de exemplo.</p>
        <div class="lp-act">
          <LandingCta to="/criar-conta" position="quiz" section>Fazer um simulado com meu material</LandingCta>
          <span class="lp-fine" data-testid="landing-ai-quiz">{{ landingAiLine(catalog) }}</span>
        </div>
      </div>
      <div class="lp-quiz-media" data-reveal="scale">
        <LandingPhone><LandingClip clip="simulado" /></LandingPhone>
        <LandingMascot pose="thinking" class="lp-quiz-m lp-float" />
        <p class="lp-bubble">Q3, Q5 e Q8. Já virou card.</p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
// Questões (prd-landing-d RF-D5): the light amber of the owner (06/11; the dark amber read as brown), the 70% in
// black counting up, amber bars by assunto, the real result clip, and the thinking dolphin saying which ones turned
// into cards: medicine, Fisiologia (docs/research/landing-personas-2026-11.md). The bars fill with transform only
// (landing.css). The numbers and the clip are of the demo account
// (content written for it, not by the AI), and the questões need the AI: both are said in fine print.
import type { PlanCatalog } from '~/types'
import { landingAiLine } from '~/utils/landing'

defineProps<{ catalog: PlanCatalog | null }>()
</script>
