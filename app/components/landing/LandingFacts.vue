<template>
  <section class="lp-facts" aria-labelledby="landing-facts">
    <div class="lp-wrap">
      <h2 id="landing-facts" class="lp-sr">O que mais o Baigi faz</h2>
      <ul>
        <li v-for="[lead, rest] in FACTS" :key="lead"><b>{{ lead }}</b> {{ rest }}</li>
      </ul>
    </div>
  </section>
</template>

<script setup lang="ts">
// The short answers to the usual objections (landing, 10/11): text only, no cards nor icons, before the plans. Each
// fact is something the product does today (offline review: prd-revisao-offline; the weekly rest: revisão v5 Fase A).
const FACTS = [
  ['Sem internet.', 'Revise o lote de hoje no metrô; as respostas sobem depois.'],
  ['Do Anki.', 'Seus baralhos vêm com o intervalo e os erros de cada card.'],
  ['Celular e computador.', 'O mesmo Baigi, tudo sincronizado.'],
  ['Folga na sequência.', 'Perdeu um dia na semana? A sequência não quebra.'],
] as const
</script>
