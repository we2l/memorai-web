<template>
  <div class="mx-auto max-w-article px-gutter pt-8 lg:pt-12">
    <h1 class="mb-3 text-page-title text-fg-strong">Ferramentas grátis para estudar</h1>
    <p class="mb-8 text-body text-fg">Contas e listas que ajudam a decidir o que estudar e quando revisar. Sem cadastro.</p>
    <div class="grid gap-4">
      <UiListRow v-for="t in BLOG_TOOL_PAGES" :key="t.path" :to="t.path" :title="t.title" :meta="t.description" class="rounded-card bg-raised shadow-1" />
    </div>
    <section class="mt-10 flex flex-col gap-6 text-body text-fg">
      <div>
        <h2 class="mb-2 text-section text-fg-strong">Edital verticalizado</h2>
        <p>Você envia o PDF do edital ou cola o texto, e a ferramenta devolve as matérias e os assuntos do conteúdo programático numa lista para marcar o que já estudou. Mostra a data da prova e quantos dias faltam, baixa em planilha e em PDF e gera um link para mandar à turma. O arquivo é apagado depois da leitura.</p>
      </div>
      <div>
        <h2 class="mb-2 text-section text-fg-strong">Calculadora do esquecimento</h2>
        <p>Você informa há quantos dias estudou um assunto e quantas vezes já se testou nele. A calculadora estima quanto você ainda deve lembrar hoje e nos próximos 30 dias, e se vale revisar agora, com o mesmo modelo de repetição espaçada (FSRS) que o Baigi e o Anki usam. Serve para decidir o que revisar primeiro quando a matéria acumulou.</p>
      </div>
      <div>
        <h2 class="mb-2 text-section text-fg-strong">Plano até a prova</h2>
        <p>Você informa a data da prova, quantos cards quer dominar e quantos já estudou. O plano mostra quantos cards novos por dia cabem e quantas revisões vêm junto até o dia da prova, deixando os últimos dias só para revisar. Funciona para concurso, OAB, ENEM ou qualquer prova com data marcada.</p>
      </div>
    </section>
    <p class="mt-8 text-meta text-fg-muted">
      Quer entender a conta? Leia <UiLink to="/blog" variant="action">o blog</UiLink>, onde explicamos a curva do esquecimento e a repetição espaçada.
    </p>
  </div>
</template>

<script setup lang="ts">
// /ferramentas (prd-blog-seo RF-T3)
import { BLOG_TOOL_PAGES, breadcrumbJsonLd } from '~/utils/blog'

definePageMeta({ layout: 'public' })

useBlogSeo({
  title: 'Ferramentas grátis para estudar',
  description: 'Edital verticalizado, calculadora do esquecimento e plano até a prova: organize o edital, veja quanto você ainda lembra e quanto revisar por dia. Grátis, sem cadastro.',
  path: '/ferramentas',
  jsonLd: [breadcrumbJsonLd([{ name: 'Início', path: '/' }, { name: 'Ferramentas', path: '/ferramentas' }])],
})
</script>
