<template>
  <div class="landing-page">
    <LandingHeader :show-cta="!heroCtaOnScreen && !finalOnScreen" @cta="cta('header')" />

    <main>
      <LandingHero :trial="trial" @cta="cta('hero')" />
      <LandingPains />
      <LandingSteps />
      <LandingSegments :message="message" />
      <LandingBonus />

      <section id="planos" class="px-gutter py-12 lg:py-24" aria-labelledby="landing-plans" data-ds-scope>
        <div class="mx-auto max-w-4xl">
          <h2 id="landing-plans" class="text-heading text-balance text-fg-strong lg:text-heading-lg">Comece grátis, sem cartão</h2>
          <p class="mt-3 mb-8 max-w-prose text-lead text-fg" data-testid="landing-plans-lead">{{ plansLead }}</p>
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
})

const { plans: catalog, fetchPlans } = usePlans()
const trial = computed(() => catalogTrial(catalog.value))
const plansLead = computed(() => trial.value
  ? `Criar a conta não pede cartão, e o primeiro material abre ${trial.value.days} dias do Pro. Os preços e limites abaixo são os mesmos do app.`
  : 'Criar a conta não pede cartão. Os preços e limites abaixo são os mesmos do app.')
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
