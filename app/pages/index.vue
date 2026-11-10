<template>
  <div ref="root" class="landing-page">
    <LandingHeader />

    <main>
      <LandingHero :catalog="catalog" />
      <LandingCurve />
      <LandingStory :catalog="catalog" />
      <LandingQuiz :catalog="catalog" />
      <LandingProjection />
      <LandingPodcast :catalog="catalog" @sample="sample" />
      <LandingAreas :catalog="catalog" />
      <LandingPlans :catalog="catalog" :failed="failed" @retry="fetchPlans" />
      <LandingFinal />
    </main>

    <div class="lp-footer-room">
      <UiPublicFooter />
    </div>
    <LandingStickyCta :visible="stickyVisible" />
  </div>
</template>

<script setup lang="ts">
// Landing D (prd-landing-d; prototype docs/research/assets/landing-prototipo/d.html): "Chega de memória de peixe.",
// the dolphin as the guide, four color bands never touching each other, a call per section. Prerendered; prices,
// trial and the name of the paid plan only from GET /api/plans. `?m=` picks the hero before the first paint
// (LANDING_MESSAGE_SCRIPT + landing.css), and the same script turns the motion on (html.lp-motion) unless the
// system asks for reduced motion. Out of the precache: the chunk is once-*, the CSS is landing.css and the media
// and the title font live in public/landing (nuxt.config.ts).
import '~/components/landing/landing.css'
import type { LandingMessageProp } from '~/types/analytics'
import { LANDING_CTA, LANDING_MESSAGE_SCRIPT, landingMessageOf, landingQuery, type LandingArea, type LandingCtaPosition } from '~/utils/landing'
import { startLandingMotion } from '~/utils/landingMotion'
import { INDEXABLE, homeJsonLd, jsonLdScript } from '~/utils/seo'

definePageMeta({ layout: 'landing' })

const TITLE = 'Baigi: chega de memória de peixe'
const { plans: catalog, failed, fetchPlans } = usePlans()
// ~150 characters (the result page cuts longer ones) with the terms people search: flashcards, IA, revisão espaçada
const description = 'Flashcards com IA feitos do seu PDF e revisão espaçada que mostra quanto você vai lembrar na prova. Revisar é grátis. Concurso, OAB, ENEM e faculdade.'

useHead({
  title: TITLE,
  meta: [
    { name: 'robots', content: INDEXABLE },
    { name: 'description', content: description },
    { property: 'og:title', content: TITLE },
    { property: 'og:description', content: description },
    { property: 'og:type', content: 'website' },
    { property: 'og:locale', content: 'pt_BR' },
    { property: 'og:url', content: 'https://baigi.com.br/' },
    { property: 'og:site_name', content: 'Baigi' },
    // Share card (1200×630, opaque): the fold of this page captured by e2e/landing/og.ts. Without it Facebook and
    // WhatsApp crop the transparent mascot of the page (its belly turned black).
    { property: 'og:image', content: 'https://baigi.com.br/landing/og-baigi.jpg' },
    { property: 'og:image:type', content: 'image/jpeg' },
    { property: 'og:image:width', content: '1200' },
    { property: 'og:image:height', content: '630' },
    { property: 'og:image:alt', content: 'Chega de memória de peixe. O golfinho do Baigi ao lado do app no celular.' },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:image', content: 'https://baigi.com.br/landing/og-baigi.jpg' },
  ],
  // The poster of the hero's clip is the LCP: asked for first, ahead of the app's modulepreloads (measured: LCP 3.4 s
  // -> 1.6 s with applied throttling). AVIF only (the <picture> falls back to WebP); the theme of the system picks one.
  link: [{ rel: 'canonical', href: 'https://baigi.com.br/' }, ...(['light', 'dark'] as const).map(theme => ({
    rel: 'preload',
    as: 'image',
    href: `/landing/video/revisao-${theme}-poster.avif`,
    type: 'image/avif',
    media: `(prefers-color-scheme: ${theme})`,
    fetchpriority: 'high' as const,
    tagPriority: 'critical' as const,
  }))],
  script: [
    { innerHTML: LANDING_MESSAGE_SCRIPT, tagPosition: 'head' },
    { type: 'application/ld+json', innerHTML: jsonLdScript(homeJsonLd(description)) },
  ],
})


// ── Where the calls are (RF-D12): the sticky bar of the phone only when no section call shows ──
const root = ref<HTMLElement | null>(null)
const callsOnScreen = ref(new Set<Element>())
const scrolled = ref(false)
const ready = ref(false)
const { analytics: consent } = useConsent()
const noCallOnScreen = computed(() => ready.value && callsOnScreen.value.size === 0)
const stickyVisible = computed(() => noCallOnScreen.value && scrolled.value && consent.value !== null)

let callsIo: IntersectionObserver | null = null
let stopMotion: (() => void) | null = null

function onScroll() {
  scrolled.value = window.scrollY > 200
}

const observed = new WeakSet<Element>()

/** Observes every call on the page, including the ones rendered later (the plans' cards wait for the catalog). */
function observeCalls() {
  if (!root.value || !callsIo) return
  for (const el of root.value.querySelectorAll('[data-cta]')) {
    if (observed.has(el)) continue
    observed.add(el)
    callsIo.observe(el)
  }
}

function watchCalls() {
  if (!root.value || !('IntersectionObserver' in window)) return
  callsIo = new IntersectionObserver((entries) => {
    const next = new Set(callsOnScreen.value)
    for (const e of entries) {
      if (e.isIntersecting && e.target.isConnected) next.add(e.target)
      else next.delete(e.target)
    }
    // A call that left the DOM (the plans' skeleton swapped for the cards) no longer counts
    for (const el of next) if (!el.isConnected) next.delete(el)
    callsOnScreen.value = next
    ready.value = true
  })
  observeCalls()
}
watch([catalog, failed], () => nextTick(observeCalls))

// ── Measurement, with consent only (RF-D18) ──
const message = ref<LandingMessageProp>('padrao')
const { track, register } = useAnalytics()

function utm(params: URLSearchParams, key: string): string | null {
  return params.get(key)?.slice(0, 100) || null
}

function cta(position: LandingCtaPosition, area?: LandingArea) {
  track('landing_cta_clicked', { position, message: message.value, ...(area ? { area } : {}) })
}
provide(LANDING_CTA, cta)

function sample() {
  track('landing_sample_played', { message: message.value })
}

onMounted(() => {
  fetchPlans()
  if (root.value) stopMotion = startLandingMotion(root.value)
  watchCalls()
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
  message.value = landingMessageOf(document.documentElement.getAttribute('data-m'))
  const params = landingQuery()
  register({ landing_message: message.value })
  track('landing_viewed', {
    message: message.value,
    utm_source: utm(params, 'utm_source'),
    utm_medium: utm(params, 'utm_medium'),
    utm_campaign: utm(params, 'utm_campaign'),
    utm_content: utm(params, 'utm_content'),
  })
})
onBeforeUnmount(() => {
  callsIo?.disconnect()
  stopMotion?.()
  window.removeEventListener('scroll', onScroll)
})
</script>
