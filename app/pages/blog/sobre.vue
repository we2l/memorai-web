<template>
  <div class="mx-auto max-w-article px-gutter pt-8 lg:pt-12">
    <nav aria-label="Caminho" class="mb-4 text-meta text-fg-muted">
      <ol class="flex flex-wrap gap-1">
        <li><UiLink to="/blog" variant="muted">Blog</UiLink> ›</li>
        <li aria-current="page">Sobre</li>
      </ol>
    </nav>

    <div class="flex items-center gap-5">
      <UiBaigiMascot :size="112" state="idle" priority class="shrink-0" />
      <div>
        <h1 class="mb-2 text-page-title text-fg-strong">Sobre o blog do Baigi</h1>
        <p class="text-body text-fg">{{ author.role }}</p>
      </div>
    </div>

    <section class="blog-prose mt-8" aria-labelledby="h-o-que">
      <h2 id="h-o-que">O que é o Baigi</h2>
      <p>{{ author.bio }}</p>
      <p>
        No app, você manda o seu material (PDF, anotações, as questões que errou ou um baralho do Anki), os cards saem dele e
        cada um volta no dia certo. Revisar é grátis. Os artigos explicam esse método com exemplos de prova de verdade.
      </p>
    </section>

    <section class="blog-prose mt-2" aria-labelledby="h-como">
      <h2 id="h-como">Como os artigos são feitos</h2>
      <ol>
        <li><strong>Pauta:</strong> uma dúvida real de quem estuda para uma prova (o edital saiu, falta um mês, a lei seca não fica).</li>
        <li><strong>Fonte primária:</strong> o edital, o texto da lei no Planalto, o caderno de questões da banca e os estudos sobre memória. Cada fonte fica listada no fim do artigo, com o link.</li>
        <li><strong>Conferência:</strong> datas, números, artigos de lei e resultados de pesquisa são conferidos na fonte antes de publicar. As contas de intervalo usam os parâmetros padrão do FSRS, e o texto diz quando o número é uma conta nossa.</li>
        <li><strong>IA:</strong> usamos IA na pesquisa e na revisão do texto. Nenhum fato entra só porque a IA disse.</li>
        <li><strong>Atualização:</strong> a data de "Atualizado em" só muda quando um fato muda (edital novo, lei alterada, data da prova).</li>
      </ol>
    </section>

    <section class="blog-prose mt-2" aria-labelledby="h-base">
      <h2 id="h-base">O que sustenta os textos</h2>
      <ul>
        <li v-for="e in author.experience" :key="e">{{ e }}</li>
      </ul>
      <p>
        Quer saber quem desenvolve o app? Está em <NuxtLink to="/quem-faz">Quem faz o Baigi</NuxtLink>.
      </p>
    </section>

    <section class="mt-8 rounded-card bg-raised p-6 shadow-1" aria-labelledby="h-contato">
      <h2 id="h-contato" class="mb-2 text-section text-fg-strong">Achou um erro?</h2>
      <p class="mb-4 text-body text-fg">
        Escreva com o link do artigo e a fonte. A correção entra no texto e, se mudar um fato, a data de atualização também.
      </p>
      <UiButton variant="secondary" :href="`mailto:${contactEmail}`">{{ contactEmail }}</UiButton>
    </section>

    <p class="mt-8 mb-4">
      <UiLink to="/blog" variant="action" standalone class="font-semibold">Ler os artigos</UiLink>
    </p>
  </div>
</template>

<script setup lang="ts">
// /blog/sobre (prd-blog-v2 RF-A6): the author page of the brand, prerendered. What the Baigi is, how the articles are
// made and the contact. No person's name or photo here (the founder is on /quem-faz); AboutPage + Organization.
import { authors } from '#blog/index'
import { absoluteUrl, breadcrumbJsonLd } from '~/utils/blog'
import { PUBLISHER } from '~/utils/seo'
import '~/assets/css/blog-prose.css'

definePageMeta({ layout: 'public' })

const author = authors.baigi!
const contactEmail = useRuntimeConfig().public.contactEmail

useBlogSeo({
  title: 'Sobre o blog do Baigi',
  description: 'O que é o Baigi, como os artigos do blog são feitos (fonte primária, conferência, uso de IA, quando a data muda) e como avisar um erro.',
  path: '/blog/sobre',
  jsonLd: [
    {
      '@context': 'https://schema.org',
      '@type': 'AboutPage',
      'name': 'Sobre o blog do Baigi',
      'url': absoluteUrl('/blog/sobre'),
      'inLanguage': 'pt-BR',
      'mainEntity': { '@id': PUBLISHER['@id'] },
    },
    {
      '@context': 'https://schema.org',
      ...PUBLISHER,
      'description': author.bio,
      'knowsAbout': author.knowsAbout,
      'email': contactEmail,
    },
    breadcrumbJsonLd([{ name: 'Início', path: '/' }, { name: 'Blog', path: '/blog' }, { name: 'Sobre', path: '/blog/sobre' }]),
  ],
})
</script>
