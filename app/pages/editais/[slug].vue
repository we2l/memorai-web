<template>
  <article class="mx-auto max-w-article-wide px-gutter pt-6 pb-24 md:pb-6 lg:pt-10" data-testid="edital-page" :data-state="status.state">
    <nav aria-label="Caminho" class="edital-noprint mb-4 text-meta text-fg-muted">
      <ol class="flex flex-wrap gap-1">
        <li><UiLink to="/" variant="muted">Baigi</UiLink> ›</li>
        <li><UiLink :to="EDITAIS_PATH" variant="muted">Editais</UiLink> ›</li>
        <li aria-current="page">{{ page.edital.orgao_sigla }} {{ year }}</li>
      </ol>
    </nav>

    <div class="edital-noprint">
      <h1 class="break-words text-page-title text-fg-strong" data-testid="edital-page-title">{{ h1 }}</h1>
      <p class="mt-3 text-body text-fg" data-testid="edital-page-trust">
        {{ trust.before }}<a :href="page.source_url" rel="noopener nofollow" target="_blank" class="font-medium text-action-fg underline">{{ trust.link }}</a>{{ trust.after }}
        <span class="text-fg-muted"> · {{ countsLine(page.counts.subjects, page.counts.topics) }}</span>
      </p>

      <div ref="statusBox" class="mt-6">
        <EditalPageStatus :status="status" :next="next">
          <EditalPageFacts :facts="page.edital" />
        </EditalPageStatus>
      </div>
    </div>

    <EditalPublicResult ref="result" class="mt-8" :reading="reading" origin="page" :slug="page.slug" :expired="!status.open" @cta="onCta" />

    <div class="edital-noprint mt-10 flex flex-col gap-8">
      <EditalPageWeights v-if="page.weights?.length" :weights="page.weights" :page="page.edital.paginas.quadro" />

      <UiSection aria-labelledby="edital-how-title">
        <h2 id="edital-how-title" class="text-section text-fg-strong">Como estudar este edital no Baigi</h2>
        <ul class="mt-3 flex flex-col gap-2 text-body text-fg">
          <li class="flex gap-2"><Check class="mt-1 size-4 shrink-0 text-fg-muted" aria-hidden="true" />A lista vira um caderno com as matérias, os assuntos e a prova marcada.</li>
          <li class="flex gap-2"><Check class="mt-1 size-4 shrink-0 text-fg-muted" aria-hidden="true" />Os cards de cada assunto voltam no dia certo, antes de você esquecer.</li>
          <li class="flex gap-2"><Check class="mt-1 size-4 shrink-0 text-fg-muted" aria-hidden="true" />O cronograma divide os assuntos pelos dias até a prova.</li>
        </ul>
        <UiLink :to="startPath" variant="action" class="mt-4 inline-flex min-h-touch items-center font-semibold" data-testid="edital-page-start" @click="onCta('footer')">
          Testar com 6 cards de {{ page.area === 'oab' ? 'OAB' : 'concurso' }}
        </UiLink>
      </UiSection>

      <section aria-labelledby="edital-links-title">
        <h2 id="edital-links-title" class="text-section text-fg-strong">Para continuar</h2>
        <div v-if="siblings.length" class="mt-4">
          <h3 class="text-title font-semibold text-fg-strong">Outros cargos deste edital</h3>
          <ul class="mt-2 flex flex-col gap-1">
            <li v-for="s in siblings" :key="s.slug"><UiLink :to="editalPagePath(s.slug)" variant="action" class="inline-flex min-h-touch items-center">{{ s.cargo }}</UiLink></li>
          </ul>
        </div>
        <div v-if="related.length" class="mt-4">
          <h3 class="text-title font-semibold text-fg-strong">Leia também</h3>
          <ul class="mt-2 flex flex-col gap-1">
            <li v-for="a in related" :key="a.slug"><UiLink :to="`/blog/${a.slug}`" variant="action" class="inline-flex min-h-touch items-center">{{ a.title }}</UiLink></li>
          </ul>
        </div>
        <ul class="mt-4 flex flex-col gap-1">
          <li><UiLink :to="PUBLIC_EDITAL_PATH" variant="action" class="inline-flex min-h-touch items-center">Seu edital não está aqui? Verticalize grátis</UiLink></li>
          <li><UiLink :to="EDITAIS_PATH" variant="action" class="inline-flex min-h-touch items-center">Todos os editais conferidos</UiLink></li>
        </ul>
      </section>

      <section aria-labelledby="edital-sources-title" data-testid="edital-page-sources">
        <h2 id="edital-sources-title" class="text-section text-fg-strong">Fontes</h2>
        <ul class="mt-3 flex flex-col gap-2 text-body text-fg">
          <li><a :href="page.source_url" rel="noopener nofollow" target="_blank" class="text-action-fg underline">PDF oficial: {{ page.edital.numero }}</a></li>
          <li v-if="page.edital.banca_url"><a :href="page.edital.banca_url" rel="noopener nofollow" target="_blank" class="text-action-fg underline">Página do concurso na {{ page.edital.banca }}</a></li>
        </ul>
        <template v-if="page.changes.length">
          <h3 class="mt-4 text-title font-semibold text-fg-strong">O que mudou</h3>
          <ul class="mt-2 flex flex-col gap-1 text-body text-fg" data-testid="edital-page-changes">
            <li v-for="c in changes" :key="c.date + c.what"><time :datetime="c.date" class="font-semibold tabular-nums">{{ editalFullDate(c.date) }}</time>: {{ c.what }}</li>
          </ul>
        </template>
      </section>

      <p class="text-meta text-fg-muted" data-testid="edital-page-method">
        A lista foi lida pelo Baigi a partir do PDF oficial e conferida item a item com o edital em {{ editalFullDate(page.checked_at) }}.
        Confira sempre no edital: em caso de diferença, vale o edital.
        <button type="button" class="inline-flex min-h-touch items-center font-medium text-action-fg underline" data-testid="edital-page-report" @click="reporting = true">Achou um erro?</button>
      </p>
    </div>

    <LazyEditalPublicReportDialog v-if="reporting" v-model="reporting" :reading-id="page.id" initial-reason="outro" />
    <EditalPageSticky v-if="status.open" :visible="stickyVisible" :applying="!!result?.applying" @apply="result?.apply(false, false, 'sticky')" />
  </article>
</template>

<script setup lang="ts">
// /editais/{slug} (prd-paginas-edital-publicas RF-W5): a conferred edital, prerendered from content/editais/{slug}.json
// with the whole list in the HTML. The state comes from utils/editalStatus on the build's day and again on the
// visitor's (the day after the exam it already says "A prova foi em…" before the daily rebuild). Unknown slug = 404.
import { Check } from 'lucide-vue-next'
import { articles } from '#blog/index'
import { builtOn, editais } from '#editais/index'
import loaders from '#editais/pages'
import { editalYear } from '~~/modules/editais/year'
import { editalStatus, editalToday, editalFullDate } from '~/utils/editalStatus'
import { EDITAIS_PATH, editalH1, editalPagePath, editalStartPath, editalTrustLine, type EditalPageCtaPosition } from '~/utils/editalPage'
import { PUBLIC_EDITAL_PATH } from '~/utils/editalIntent'
import { countsLine, type PublicEditalReading } from '~/utils/publicEdital'

// The page has its own primary call: the header's "Criar conta grátis" goes quiet (one highlight per screen, ADR-027 §6)
definePageMeta({ layout: 'public', quietHeaderCta: true })

const route = useRoute()
const slug = String(route.params.slug)
const load = loaders[slug]
if (!load) throw createError({ statusCode: 404, statusMessage: 'Edital não encontrado', fatal: true })
const page = (await load()).default

const year = editalYear(page.slug)
// The build's day first (same HTML on hydration), then the visitor's
const today = ref(builtOn)
const status = computed(() => editalStatus(page, today.value))
const h1 = computed(() => editalH1(page, status.value))
const trust = editalTrustLine(page)
const startPath = editalStartPath(page)
const next = page.next_slug ? editais.find(m => m.slug === page.next_slug) ?? null : null
const siblings = editais.filter(m => page.siblings.includes(m.slug))
const related = page.related_blog.map(s => articles.find(a => a.slug === s)).filter((a): a is NonNullable<typeof a> => !!a)
const changes = [...page.changes].sort((a, b) => b.date.localeCompare(a.date))

const reading: PublicEditalReading & { proposal: NonNullable<PublicEditalReading['proposal']> } = {
  id: page.id,
  status: 'ready',
  proposal: page.proposal,
  weights: page.weights,
  counts: page.counts,
  curated: { slug: page.slug, source_url: page.source_url, checked_at: page.checked_at },
}

useEditalPageSeo(page, editalStatus(page, builtOn))

const { track } = useAnalytics()
const reporting = ref(false)
const result = ref<{ apply: (allowDuplicate?: boolean, auto?: boolean, position?: EditalPageCtaPosition) => Promise<void>, applying: boolean } | null>(null)

function onCta(position: EditalPageCtaPosition) {
  track('edital_page_cta_clicked', { slug: page.slug, position })
}

/* ---- The bar of the phone: after the Situação box, never with the actions on screen ---- */
const statusBox = ref<HTMLElement | null>(null)
const statusPassed = ref(false)
const actionsOnScreen = ref(false)
const stickyVisible = computed(() => statusPassed.value && !actionsOnScreen.value)
let observer: IntersectionObserver | null = null

onMounted(() => {
  today.value = editalToday()
  track('edital_page_viewed', { slug: page.slug, status: status.value.state })
  if (typeof IntersectionObserver === 'undefined') return
  const actions = document.querySelector('[data-testid="edital-actions"]')
  observer = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.target === statusBox.value) statusPassed.value = !e.isIntersecting && e.boundingClientRect.top < 0
      else actionsOnScreen.value = e.isIntersecting
    }
  })
  if (statusBox.value) observer.observe(statusBox.value)
  if (actions) observer.observe(actions)
})
onBeforeUnmount(() => observer?.disconnect())
</script>
