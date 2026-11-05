<template>
  <div class="landing-page">
    <LandingHeader :show-cta="!heroCtaOnScreen && !finalOnScreen" @cta="cta('header')" />

    <main>
      <LandingHero :trial="trial" @cta="cta('hero')" />
      <LandingPains />
      <LandingSteps />
      <LandingProjection />
      <LandingSegments />

      <section id="planos" class="px-gutter py-14 lg:py-20" aria-labelledby="landing-plans" data-ds-scope>
        <div class="mx-auto max-w-4xl">
          <h2 id="landing-plans" class="text-heading text-balance text-fg-strong lg:text-heading-lg">Comece grátis, sem cartão</h2>
          <p class="mt-3 max-w-prose text-lead text-fg" data-testid="landing-plans-lead">{{ plansLead }}</p>
          <!-- The podcast as a bonus of Pro (RF-L6; research: audio is a niche, never the main promise), no number here -->
          <p class="mt-4 mb-8 flex max-w-prose items-start gap-3 text-body text-fg" data-testid="landing-bonus">
            <UiPracticeIcon mode="listen" size="sm" />
            <span><strong class="font-semibold text-fg-strong">Bônus do Pro:</strong> um episódio em áudio feito dos cards que você mais errou, para revisar quando as mãos estão ocupadas. A duração e quantos episódios por mês estão nos planos.</span>
          </p>
          <!-- Far below the fold: the offer's chunk loads when the section nears the screen (route budget, RF-L14) -->
          <LazyPlansPlanCards v-model:period="period" hydrate-on-visible>
            <template #free-action>
              <UiButton block to="/criar-conta" data-testid="landing-plans-free" @click="cta('plans_free')">Criar conta grátis</UiButton>
            </template>
            <template #pro-action>
              <UiButton block to="/planos" data-testid="landing-plans-pro" @click="cta('plans_pro')">Ver o Pro em detalhe</UiButton>
            </template>
          </LazyPlansPlanCards>
        </div>
      </section>

      <LandingFaq :trial="trial" />
      <LandingFinal @cta="cta('final')" />
    </main>

    <UiPublicFooter />
    <LandingStickyCta :visible="stickyVisible" @cta="cta('sticky')" />
  </div>
</template>

<script setup lang="ts">
// Landing v4 (prd-landing-v4): one promise, the real app on screen, phone first, DS v3. Prerendered; prices and
// limits only from GET /api/plans (PlanCards, catalogTrial); `?m=` picks the hero before the first paint
// (LANDING_MESSAGE_SCRIPT + landing.css). One highlight per visible screen: every section with an action is its
// own [data-ds-scope], and the header/sticky actions only show when neither the hero's nor the final one is on
// screen. Out of the precache: the chunk is once-* and the CSS is landing.css (nuxt.config.ts).
import '~/components/landing/landing.css'
import type { BillingPeriod } from '~/components/plans/BillingToggle.vue'
import type { LandingCtaPosition } from '~/types/analytics'
import { LANDING_MESSAGE_SCRIPT, catalogTrial, landingMessageOf, landingQuery } from '~/utils/landing'

definePageMeta({ layout: 'landing' })

const TITLE = 'Baigi: saiba quanto você vai lembrar no dia da prova'
const DESCRIPTION = 'Mande seu PDF ou suas anotações. O Baigi cria os cards, diz o que revisar a cada dia e mostra quanto você domina de cada assunto. Para concurso, OAB, ENEM, faculdade, medicina e idiomas.'

useHead({
  title: TITLE,
  meta: [
    { name: 'description', content: DESCRIPTION },
    { property: 'og:title', content: TITLE },
    { property: 'og:description', content: DESCRIPTION },
    { property: 'og:type', content: 'website' },
    { property: 'og:locale', content: 'pt_BR' },
  ],
  script: [{ innerHTML: LANDING_MESSAGE_SCRIPT, tagPosition: 'head' }],
  // The screen of the hero is the LCP and sits deep in a long prerendered HTML: fetch it from the <head>, in the
  // system theme (the same choice as the <picture> of LandingShot)
  link: [
    { rel: 'preload', as: 'image', type: 'image/avif', href: '/landing/hoje-light.avif', media: '(prefers-color-scheme: light)', fetchpriority: 'high' },
    { rel: 'preload', as: 'image', type: 'image/avif', href: '/landing/hoje-dark.avif', media: '(prefers-color-scheme: dark)', fetchpriority: 'high' },
  ],
})

const { plans: catalog, fetchPlans } = usePlans()
const trial = computed(() => catalogTrial(catalog.value))
const plansLead = computed(() => trial.value
  ? `Criar a conta não pede cartão, e o primeiro material abre ${trial.value.days} dias do Pro. Revisar, organizar cadernos e criar seus cards não têm prazo.`
  : 'Criar a conta não pede cartão. Revisar, organizar cadernos e criar seus cards não têm prazo; o que usa IA tem os limites de cada plano.')
const period = ref<BillingPeriod>('annual')

// ── Where the actions are (RF-L1, RF-L10) ──
const heroCtaOnScreen = ref(true)
const finalOnScreen = ref(false)
const { analytics: consent } = useConsent()
const stickyVisible = computed(() => !heroCtaOnScreen.value && !finalOnScreen.value && consent.value !== null)

let observer: IntersectionObserver | null = null
function watchActions() {
  const hero = document.querySelector('[data-landing="hero-cta"]')
  const final = document.querySelector('[data-landing="final"]')
  if (!hero || !final || !('IntersectionObserver' in window)) return
  observer = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.target === hero) heroCtaOnScreen.value = e.isIntersecting
      else finalOnScreen.value = e.isIntersecting
    }
  })
  observer.observe(hero)
  observer.observe(final)
}

// ── Measurement, with consent only (RF-L13) ──
const message = ref(landingMessageOf(null))
const { track, register } = useAnalytics()

function utm(params: URLSearchParams, key: string): string | null {
  return params.get(key)?.slice(0, 100) || null
}

function cta(position: LandingCtaPosition) {
  track('landing_cta_clicked', { position, message: message.value })
}

onMounted(() => {
  fetchPlans()
  watchActions()
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
onBeforeUnmount(() => observer?.disconnect())
</script>
