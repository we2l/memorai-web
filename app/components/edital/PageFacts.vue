<template>
  <!-- Only what the edital says, each line with its page (R5.8); an empty optional field does not show -->
  <dl class="mt-4 divide-y divide-hairline border-t border-hairline" data-testid="edital-page-facts">
    <div v-for="row in rows" :key="row.label" class="edital-fact grid gap-1 py-3">
      <dt class="text-meta font-semibold text-fg-muted">{{ row.label }}</dt>
      <dd class="min-w-0 break-words text-body text-fg-strong">
        {{ row.value }}<span v-if="row.page" class="ml-2 whitespace-nowrap text-meta text-fg-muted">p. {{ row.page }}</span>
      </dd>
    </div>
  </dl>
</template>

<script setup lang="ts">
import type { EditalFacts } from '~~/modules/editais/types'
import { editalFullDate } from '~/utils/editalStatus'

const props = defineProps<{ facts: EditalFacts }>()

const rows = computed(() => {
  const f = props.facts
  const p = f.paginas ?? {}
  const out: { label: string, value: string, page?: number }[] = [
    { label: 'Órgão', value: f.orgao, page: p.orgao },
    { label: 'Cargo', value: f.cargos_mesma_lista.length ? `${f.cargo} (a mesma lista vale para ${f.cargos_mesma_lista.join(', ')})` : f.cargo, page: p.cargo },
    { label: 'Banca', value: f.banca, page: p.banca },
    { label: 'Edital', value: f.publicado_em ? `${f.numero}, de ${editalFullDate(f.publicado_em)}` : f.numero, page: p.numero ?? p.publicado_em },
  ]
  if (f.inscricoes_fim) {
    out.push({ label: 'Inscrições', value: f.inscricoes_inicio ? `De ${editalFullDate(f.inscricoes_inicio)} a ${editalFullDate(f.inscricoes_fim)}` : `Até ${editalFullDate(f.inscricoes_fim)}`, page: p.inscricoes })
  }
  if (f.taxa) out.push({ label: 'Taxa de inscrição', value: f.taxa, page: p.taxa })
  if (f.prova) out.push({ label: 'Prova', value: f.prova_prevista ? `Prevista para ${editalFullDate(f.prova)}` : editalFullDate(f.prova), page: p.prova })
  if (f.vagas) out.push({ label: 'Vagas', value: f.vagas, page: p.vagas })
  if (f.remuneracao) out.push({ label: 'Remuneração inicial', value: f.remuneracao, page: p.remuneracao })
  return out
})
</script>

<style scoped>
@media (min-width: 640px) {
  .edital-fact { grid-template-columns: minmax(0, 12rem) 1fr; column-gap: 1rem; }
}
</style>
