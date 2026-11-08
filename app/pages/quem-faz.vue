<template>
  <div class="mx-auto max-w-prose px-gutter pt-8 lg:pt-12">
    <div class="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
      <BlogAuthorPhoto v-if="author.photo" :photo="author.photo" :alt="`${firstName}, criador do Baigi`" :size="160" eager />
      <div>
        <h1 class="mb-2 text-page-title-sm text-fg-strong sm:text-page-title">Quem faz o Baigi</h1>
        <p class="text-body text-fg">{{ author.name }} · {{ author.role }}</p>
      </div>
    </div>

    <!-- REVISAR (dono): a história em primeira pessoa abaixo; troque pelo seu jeito de contar se algo não bater -->
    <section class="blog-prose mt-8" aria-labelledby="h-quem">
      <h2 id="h-quem">Oi, eu sou o {{ firstName }}</h2>
      <p>
        Sou desenvolvedor. Por anos eu estudei do jeito que quase todo mundo estuda: lia, grifava, fazia resumo e, umas semanas
        depois, tinha esquecido boa parte. Não era falta de esforço. Eu só não revisava na hora certa, porque não tinha como saber
        qual era a hora certa.
      </p>
      <p>
        Quando fui ler as pesquisas sobre memória, a resposta era antiga e bem estabelecida: se testar em vez de reler, e espaçar as
        revisões. O difícil é fazer isso todo dia sem uma ferramenta que diga o que revisar. Então eu fiz a ferramenta.
      </p>
    </section>

    <section class="blog-prose mt-2" aria-labelledby="h-porque">
      <h2 id="h-porque">Por que o Baigi existe</h2>
      <p>
        Quem estuda para prova já paga aula, questões e material. O que falta quase sempre é lembrar do que já estudou até o dia
        da prova. O Baigi cuida disso: transforma o seu material em perguntas, traz cada uma de volta perto do momento em que você
        ia esquecer e mostra quanto você deve lembrar no dia da prova.
      </p>
      <p>
        O Baigi é feito por uma pessoa só. Não há cursinho, investidor nem equipe de vendas por trás. Isso tem lado bom (respondo
        os e-mails eu mesmo) e lado ruim (algumas coisas demoram mais).
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

    <section class="mt-8 rounded-card bg-raised p-6 shadow-card" aria-labelledby="h-contato">
      <h2 id="h-contato" class="mb-2 text-section text-fg-strong">Contato</h2>
      <p class="mb-4 text-body text-fg">
        Dúvida, sugestão, erro num artigo ou problema com a conta: escreva para mim. Leio tudo.
      </p>
      <UiButton variant="primary" href="mailto:contato@baigi.com.br">contato@baigi.com.br</UiButton>
    </section>

    <section v-if="articles.length" class="mt-10" aria-labelledby="h-artigos">
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
// Termos and the checkout. Real photo sent by the owner, no EXIF (public/quem-faz).
import { articles, authors } from '#blog/index'
import { SITE_URL, absoluteUrl, breadcrumbJsonLd, personJsonLd } from '~/utils/blog'
import '~/assets/css/blog-prose.css'

// The page has its own primary call: the header's "Criar conta grátis" goes quiet (one highlight per screen, ADR-027 §6)
definePageMeta({ layout: 'public', quietHeaderCta: true })

const author = authors.weslley!
const firstName = author.name.split(' ')[0]
const mine = articles.filter(a => a.author === author.id)

const DESCRIPTION = 'O Baigi é feito por um desenvolvedor só, que criou o app porque esquecia o que estudava. Quem é, por que o app existe, como funciona e como falar comigo.'
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
      'email': 'contato@baigi.com.br',
      'founder': personJsonLd(author),
    },
    breadcrumbJsonLd([{ name: 'Início', path: '/' }, { name: 'Quem faz o Baigi', path: '/quem-faz' }]),
  ],
})
</script>
