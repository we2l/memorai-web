<template>
  <div class="mx-auto max-w-article px-gutter pt-8 lg:pt-12">
    <div class="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
      <BlogAuthorPhoto v-if="author.photo" :photo="author.photo" :alt="`${firstName}, criador do Baigi`" :size="160" eager />
      <div>
        <h1 class="mb-2 text-page-title text-fg-strong">Quem faz o Baigi</h1>
        <p class="text-body text-fg">{{ author.name }} · {{ author.role }}</p>
      </div>
    </div>

    <!-- REVISAR (dono): a história em primeira pessoa, com os fatos que você deu em 08/11 -->
    <section class="blog-prose mt-8" aria-labelledby="h-quem">
      <h2 id="h-quem">Oi, eu sou o {{ firstName }}</h2>
      <p>
        Sou desenvolvedor de software há mais de 5 anos. Também estudo inglês, e por muito tempo estudei usando muito o Anki e
        fazendo resumos. Mesmo assim, esquecia muita coisa.
      </p>
      <p>
        Minha namorada estuda para concurso. São estudos bem diferentes, mas o problema é o mesmo: chegar no dia de usar o
        que aprendeu e ainda lembrar.
      </p>
    </section>

    <section class="blog-prose mt-2" aria-labelledby="h-porque">
      <h2 id="h-porque">Por que o Baigi existe</h2>
      <p>
        Criei o Baigi para nós dois: para o meu inglês e para ajudar minha namorada a passar no concurso. Eu queria uma ferramenta
        que tirasse o trabalho de montar os cards e dissesse, todo dia, o que revisar e quanto da matéria a gente ainda lembrava.
      </p>
      <p>
        O Baigi continua sendo feito por uma pessoa só, sem cursinho nem investidor por trás. Por isso, quem escreve para o
        contato fala comigo.
      </p>
    </section>

    <section class="blog-prose mt-2" aria-labelledby="h-como">
      <h2 id="h-como">Como funciona</h2>
      <ul>
        <li>Você manda um PDF, suas anotações ou as questões que errou, ou importa um baralho do Anki.</li>
        <li>O Baigi cria os cards a partir do seu material, e você pode editar ou apagar qualquer um.</li>
        <li>Cada card volta no dia certo pelo FSRS-6, um algoritmo de repetição espaçada de código aberto, o mesmo que o Anki usa.</li>
        <li>Você vê quanto domina de cada assunto e quanto deve lembrar na data da prova. Revisar é grátis.</li>
      </ul>
      <p>
        Escrevo sobre o que aprendi no <NuxtLink to="/blog">blog</NuxtLink>, sempre com as fontes. E as duas
        <NuxtLink to="/ferramentas">ferramentas grátis</NuxtLink> fazem a mesma conta que o app.
      </p>
    </section>

    <section class="blog-prose mt-2" aria-labelledby="h-fiz">
      <h2 id="h-fiz">O que eu fiz até aqui</h2>
      <ul>
        <li v-for="e in author.experience" :key="e">{{ e }}</li>
      </ul>
    </section>

    <section class="mt-8 rounded-card bg-raised p-6 shadow-1" aria-labelledby="h-contato">
      <h2 id="h-contato" class="mb-2 text-section text-fg-strong">Contato</h2>
      <p class="mb-4 text-body text-fg">
        Dúvida, sugestão, erro num artigo ou problema com a conta: escreva para mim.
      </p>
      <UiButton variant="primary" :href="`mailto:${contactEmail}`">{{ contactEmail }}</UiButton>
    </section>

    <section v-if="mine.length" class="mt-10" aria-labelledby="h-artigos">
      <h2 id="h-artigos" class="mb-4 text-section text-fg-strong">Artigos que eu escrevi</h2>
      <div class="grid gap-4">
        <BlogArticleCard v-for="a in mine" :key="a.slug" :article="a" />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
// "Quem faz o Baigi" (prd-blog-seo RF-B8): the author page of the blog and the seller page the checkout links to
// (keep the URL /quem-faz). No CPF or address here: the seller identification of the Decreto 7.962/2013 stays in the
// Termos and the checkout. Real photo sent by the owner, no EXIF (public/quem-faz). The contact comes from
// runtimeConfig (NUXT_PUBLIC_CONTACT_EMAIL).
import { articles, authors } from '#blog/index'
import { SITE_URL, absoluteUrl, breadcrumbJsonLd, personJsonLd } from '~/utils/blog'
import '~/assets/css/blog-prose.css'

// The page has its own primary call: the header's "Criar conta grátis" goes quiet (one highlight per screen, ADR-027 §6)
definePageMeta({ layout: 'public', quietHeaderCta: true })

const author = authors.weslley!
const firstName = author.name.split(' ')[0]
const mine = articles.filter(a => a.author === author.id)
const contactEmail = useRuntimeConfig().public.contactEmail

const DESCRIPTION = 'O Baigi é feito por um desenvolvedor só, que esquecia o inglês que estudava no Anki. Quem é, por que o app existe, como funciona e como falar comigo.'
useBlogSeo({
  title: 'Quem faz o Baigi',
  description: DESCRIPTION,
  path: '/quem-faz',
  image: author.photo ? `${author.photo}.webp` : null,
  jsonLd: [
    {
      '@context': 'https://schema.org',
      '@type': 'AboutPage',
      'name': 'Quem faz o Baigi',
      'url': absoluteUrl('/quem-faz'),
      'inLanguage': 'pt-BR',
      'mainEntity': { '@context': 'https://schema.org', ...personJsonLd(author), 'worksFor': { '@type': 'Organization', 'name': 'Baigi', 'url': `${SITE_URL}/` } },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      'name': 'Baigi',
      'url': `${SITE_URL}/`,
      'logo': `${SITE_URL}/pwa-512x512.png`,
      'email': contactEmail,
      'founder': personJsonLd(author),
    },
    breadcrumbJsonLd([{ name: 'Início', path: '/' }, { name: 'Quem faz o Baigi', path: '/quem-faz' }]),
  ],
})
</script>
