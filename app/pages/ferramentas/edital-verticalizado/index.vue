<template>
  <div class="mx-auto max-w-article-wide px-gutter pt-8 lg:pt-12">
    <nav aria-label="Caminho" class="mx-auto mb-4 max-w-article text-meta text-fg-muted">
      <UiLink to="/ferramentas" variant="muted">Ferramentas</UiLink>
    </nav>
    <h1 class="mx-auto mb-3 max-w-article text-page-title text-fg-strong">Edital verticalizado grátis</h1>
    <p class="blog-lead mx-auto mb-8 max-w-article text-fg">
      Envie o edital. Em menos de um minuto, você tem as matérias e os assuntos para marcar o que já estudou, e um cronograma até a prova. Grátis. Sem cadastro para ver e marcar.
    </p>

    <UiSection class="mx-auto max-w-article" aria-label="Enviar o edital">
      <EditalPublicForm />
    </UiSection>

    <section class="blog-prose mx-auto mt-10 max-w-article" aria-labelledby="h-como">
      <h2 id="h-como">Como usar</h2>
      <ol>
        <li><strong>Verticalize.</strong> Mandamos o conteúdo programático do edital para a leitura e devolvemos cada matéria com os assuntos, um por linha.</li>
        <li><strong>Marque.</strong> Passe o que já estudou. O progresso fica neste aparelho, e cada pessoa da turma marca o seu.</li>
        <li><strong>Revise.</strong> Para guardar o que estudou, crie o caderno no Baigi: a lista vira matérias e assuntos prontos, com a data da prova.</li>
      </ol>
      <p>Quer fazer à mão, em planilha? Veja <NuxtLink to="/blog/o-que-e-edital-verticalizado">o que é edital verticalizado e como montar o seu</NuxtLink>.</p>
    </section>

    <UiSection title="Perguntas rápidas" flush class="mx-auto mt-8 mb-4 max-w-article px-5 pt-5 pb-1 sm:px-6 sm:pt-6">
      <div class="divide-y divide-hairline">
        <details v-for="faq in FAQS" :key="faq.q" class="group">
          <summary class="flex min-h-touch cursor-pointer list-none items-center justify-between gap-3 py-2 text-body font-semibold text-fg-strong">
            {{ faq.q }}
            <ChevronDown class="size-4 shrink-0 text-fg-muted transition-transform duration-fast group-open:rotate-180" aria-hidden="true" />
          </summary>
          <p class="pb-4 text-body text-fg">{{ faq.a }}</p>
        </details>
      </div>
    </UiSection>
  </div>
</template>

<script setup lang="ts">
// /ferramentas/edital-verticalizado (prd-edital-verticalizado-publico RF-F1): prerendered, no account. The PDF or the
// pasted text goes to POST /public/editais with the Turnstile token (EditalPublicForm, also in the entry of /comecar);
// the reading itself happens on /r/{id}.
import { ChevronDown } from 'lucide-vue-next'
import { breadcrumbJsonLd, faqJsonLd, toolJsonLd } from '~/utils/blog'
import { PUBLIC_EDITAL_PATH } from '~/utils/editalIntent'
import '~/assets/css/blog-prose.css'

// The page has its own primary call: the header's "Criar conta grátis" goes quiet (one highlight per screen, ADR-027 §6)
definePageMeta({ layout: 'public', quietHeaderCta: true })

const FAQS = [
  { q: 'O que é edital verticalizado?', a: 'É o conteúdo programático do edital em lista, com uma linha por assunto, agrupada por matéria, para você marcar o que já estudou e revisou. Quem verticaliza o edital sabe o que cai, o que já viu e o que falta.' },
  { q: 'Posso baixar o edital verticalizado em planilha ou PDF?', a: 'Sim. A planilha sai em CSV, que abre no Excel e no Google Planilhas, e o PDF sai pronto para imprimir, com caixas para marcar à mão. O PDF pede o seu e-mail.' },
  { q: 'Como o cronograma é feito?', a: 'Você diz quantas horas tem em cada dia da semana e o tamanho da sessão. O cronograma passa por todos os assuntos uma vez, com mais tempo para as matérias que valem mais pontos no edital, alterna as matérias ao longo da semana e deixa os últimos 7 dias antes da prova para revisão e simulados. Os assuntos que você marca como estudados saem da fila.' },
  { q: 'É grátis mesmo?', a: 'Sim. Ver, marcar, montar o cronograma, baixar a planilha e mandar o link não pedem nada. O PDF e a agenda pedem só o seu e-mail; criar o caderno no Baigi pede uma conta.' },
  { q: 'Vocês guardam meu PDF?', a: 'Não. O arquivo é apagado depois da leitura. Fica só a lista de matérias e assuntos, no link do resultado.' },
  { q: 'Confere com o edital oficial?', a: 'Use como guia e confira no edital oficial. A leitura é automática e pode errar um item ou outro.' },
]

const TITLE = 'Edital verticalizado grátis e cronograma de estudos'
const DESCRIPTION = 'Envie o PDF do edital ou cole o texto e receba as matérias e os assuntos numa lista para marcar o que já estudou, e um cronograma até a prova. Lista e planilha grátis; o PDF pede só o seu e-mail.'
useBlogSeo({
  title: TITLE,
  description: DESCRIPTION,
  path: PUBLIC_EDITAL_PATH,
  jsonLd: [
    toolJsonLd('Edital verticalizado grátis', DESCRIPTION, PUBLIC_EDITAL_PATH),
    breadcrumbJsonLd([{ name: 'Início', path: '/' }, { name: 'Ferramentas', path: '/ferramentas' }, { name: 'Edital verticalizado', path: PUBLIC_EDITAL_PATH }]),
    // The answers of the schema are the visible ones (FAQS above)
    faqJsonLd(FAQS),
  ],
})

// The aggregate funnel (no cookie, no id; utils/funnelCount.ts): a visitor who stays 1.5 s counts as edital_viewed,
// with the video of the short link (/edital, /yt31, /tk31) when there is one. Loaded on demand, out of the closure.
const auth = useAuthStore()
const apiBase = useRuntimeConfig().public.apiBase as string
let stopViewed: (() => void) | null | undefined
onMounted(() => {
  import('~/utils/funnelCount')
    .then((m) => { if (stopViewed !== null) stopViewed = m.countPageViewed(apiBase, 'edital_viewed', () => !!auth.user) })
    .catch(() => { /* intencional: contagem perdida não afeta a pessoa */ })
})
onBeforeUnmount(() => {
  stopViewed?.()
  stopViewed = null
})


</script>
