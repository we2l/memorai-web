<template>
  <div class="mx-auto max-w-article px-gutter pt-8 pb-6 lg:pt-12" data-testid="editais-index">
    <nav aria-label="Caminho" class="mb-4 text-meta text-fg-muted">
      <UiLink to="/" variant="muted">Baigi</UiLink>
    </nav>
    <h1 class="mb-3 text-page-title text-fg-strong">{{ TITLE }}</h1>
    <p class="mb-8 text-body text-fg">Cada lista foi conferida com o edital oficial. A data da conferência está em cada página.</p>

    <!-- Without any conferred edital nothing of /editais is prerendered nor linked (modules/editais): this is the SPA
         shell of a direct visit, still noindex -->
    <UiEmptyState
      v-if="!editais.length"
      title="Ainda não há editais conferidos"
      description="Enquanto isso, verticalize o seu: envie o PDF e receba as matérias e os assuntos numa lista para marcar."
      data-testid="editais-empty"
    >
      <template #action>
        <UiButton variant="primary" :to="PUBLIC_EDITAL_PATH">Verticalizar o meu edital</UiButton>
      </template>
    </UiEmptyState>

    <template v-else>
      <section aria-labelledby="editais-open-title">
        <h2 id="editais-open-title" class="mb-3 text-section text-fg-strong">Abertos</h2>
        <ul v-if="open.length" class="flex flex-col gap-3" data-testid="editais-open">
          <li v-for="m in open" :key="m.slug">
            <UiListRow :to="editalPagePath(m.slug)" :title="editalShortName(m)" :meta="rowMeta(m)" class="rounded-card bg-raised shadow-1" data-testid="editais-row" />
          </li>
        </ul>
        <p v-else class="text-body text-fg-muted">Nenhum edital aberto agora. Os encerrados seguem abaixo como base de estudo.</p>
      </section>

      <UiListRow
        :to="PUBLIC_EDITAL_PATH"
        title="Seu edital não está aqui?"
        meta="Verticalize grátis em menos de um minuto."
        class="mt-8 rounded-card bg-raised shadow-1"
        data-testid="editais-tool"
      />

      <details v-if="closed.length" class="group mt-8" data-testid="editais-closed">
        <summary class="flex min-h-touch cursor-pointer list-none items-center justify-between gap-3 text-section text-fg-strong">
          Encerrados ({{ closed.length }})
          <ChevronDown class="size-5 shrink-0 text-fg-muted transition-transform duration-fast group-open:rotate-180" aria-hidden="true" />
        </summary>
        <ul class="mt-3 flex flex-col gap-3">
          <li v-for="m in closed" :key="m.slug">
            <UiListRow :to="editalPagePath(m.slug)" :title="editalShortName(m)" :meta="rowMeta(m)" class="rounded-card bg-raised shadow-1" />
          </li>
        </ul>
      </details>
    </template>
  </div>
</template>

<script setup lang="ts">
// /editais (prd-paginas-edital-publicas RF-W7): the conferred editais, open first (inscrições to open, open or closed
// with the exam ahead), the ones past the exam or cancelled below, collapsed (their pages are noindex). Prerendered only
// when content/editais has a page; the states are the build's day, then the visitor's (utils/editalStatus).
import { ChevronDown } from 'lucide-vue-next'
import type { EditalPageMeta } from '~~/modules/editais/types'
import { builtOn, editais } from '#editais/index'
import { editalShortDate, editalStatus, editalToday } from '~/utils/editalStatus'
import { EDITAIS_PATH, editaisIndexJsonLd, editalPagePath, editalShortName } from '~/utils/editalPage'
import { PUBLIC_EDITAL_PATH } from '~/utils/editalIntent'

definePageMeta({ layout: 'public', quietHeaderCta: true })

const TITLE = 'Editais verticalizados conferidos'
const DESCRIPTION = 'Editais de concurso em lista, com todas as matérias e assuntos conferidos com o PDF oficial. Marque o que já estudou e monte o cronograma até a prova, grátis.'

const today = ref(builtOn)
const statusOf = (m: EditalPageMeta, day: string) => editalStatus({ edital: m, expires_on: m.expires_on, status_override: m.status_override, status_date: m.status_date }, day)
const byExam = (a: EditalPageMeta, b: EditalPageMeta) => (a.prova ?? a.expires_on ?? '').localeCompare(b.prova ?? b.expires_on ?? '') || a.slug.localeCompare(b.slug)
const open = computed(() => editais.filter(m => statusOf(m, today.value).open).sort(byExam))
const closed = computed(() => editais.filter(m => !statusOf(m, today.value).open).sort((a, b) => byExam(b, a)))

function rowMeta(m: EditalPageMeta): string {
  const label = statusOf(m, today.value).label
  return [
    m.banca,
    m.prova && !/prova/i.test(label) ? `${m.prova_prevista ? 'prova prevista para' : 'prova em'} ${editalShortDate(m.prova)}` : null,
    `${m.topics} ${m.topics === 1 ? 'assunto' : 'assuntos'}`,
    `conferido em ${editalShortDate(m.checked_at)}`,
    label,
  ].filter(Boolean).join(' · ')
}

if (editais.length) {
  const openAtBuild = editais.filter(m => statusOf(m, builtOn).open).sort(byExam)
  useBlogSeo({ title: TITLE, description: DESCRIPTION, path: EDITAIS_PATH, jsonLd: [editaisIndexJsonLd(TITLE, DESCRIPTION, openAtBuild)] })
} else {
  useHead({ title: `${TITLE} · Baigi` })
}

onMounted(() => { today.value = editalToday() })
</script>
