<template>
  <section class="px-gutter py-14 lg:py-20" aria-labelledby="landing-projection">
    <div class="mx-auto grid max-w-page items-center gap-10 lg:grid-cols-2 lg:gap-20">
      <div>
        <h2 id="landing-projection" class="text-heading text-balance text-fg-strong lg:text-heading-lg">Como o Baigi sabe quanto você vai lembrar</h2>
        <p class="mt-3 max-w-prose text-lead text-fg">
          Para cada card dos assuntos da prova, o Baigi calcula a chance de você lembrar dele no dia, pelo histórico das suas revisões. A conta aparece quando a prova está marcada e já há pelo menos 20 cards nos assuntos dela, 10 deles revisados mais de uma vez.
        </p>
        <dl class="mt-8 flex flex-col gap-5">
          <div v-for="row in PROJECTION" :key="row.term">
            <dt class="text-section text-fg-strong">{{ row.term }}</dt>
            <dd class="mt-1 text-body text-fg">{{ row.text }}</dd>
          </div>
        </dl>
      </div>
      <!-- The exam with its two numbers, then the domínio by matéria: the same screen of the app (Progresso) -->
      <div class="mx-auto flex w-full max-w-sm flex-col gap-4 lg:max-w-md">
        <LandingShot name="projecao" />
        <LandingShot name="dominio" />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
// The promise explained (prd-landing-v4 RF-L3c; research rodada 2 §1.4: the risk is "how do you know?"): what the
// two numbers of the hero mean, in plain words, next to the real domínio by matéria of the demo account.
import { PROJECTION } from '~/utils/landing'
</script>
