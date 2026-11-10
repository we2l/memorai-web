<template>
  <section id="erros" class="lp-sec lp-errors" aria-labelledby="landing-errors">
    <div class="lp-wrap lp-split">
      <div>
        <h2 id="landing-errors" class="lp-h2" data-reveal>Seus erros viram estudo.</h2>
        <p class="lp-lead" data-reveal>A questão que você errou, o card que não fica na cabeça e a dúvida no meio da revisão têm para onde ir.</p>
        <ul data-reveal>
          <li v-for="[lead, rest] in POINTS" :key="lead">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7" /></svg>
            <span><b>{{ lead }}</b> {{ rest }}</span>
          </li>
        </ul>
        <p class="lp-fine lp-demo-note" data-testid="landing-demo-errors">Tela da conta de demonstração, com conteúdo de exemplo.</p>
        <div class="lp-act">
          <LandingCta to="/comecar" position="errors" section>Colar uma questão que errei</LandingCta>
          <span class="lp-fine" data-testid="landing-ai-errors">O “Por quê?” usa a IA. {{ landingAiLine(catalog) }}</span>
        </div>
      </div>
      <div class="lp-errors-media" data-reveal="scale">
        <LandingPhone><LandingScreen name="leech" /></LandingPhone>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
// "Seus erros viram estudo" (landing, 10/11): the cycle of an error in one place: the pasted question (no AI, every
// plan), "Por quê?" with the excerpt of the material (AI: said in fine print) and the card that never sticks (a real
// screen of the demo account, 5 errors).
import type { PlanCatalog } from '~/types'
import { landingAiLine } from '~/utils/landing'

defineProps<{ catalog: PlanCatalog | null }>()

const POINTS = [
  ['Cole a questão que errou.', 'Ela vira card com o gabarito e o comentário no verso, em qualquer plano.'],
  ['Errou um card? Toque em “Por quê?”.', 'A explicação vem com o trecho do seu material de onde o card saiu.'],
  ['Errou de novo e de novo?', 'O Baigi avisa que o card não está colando e ajuda a reescrever, explicar ou pausar.'],
] as const
</script>
