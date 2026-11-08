<template>
  <section id="planos" class="lp-sec lp-plans-sec" aria-labelledby="landing-plans">
    <div class="lp-wrap">
      <h2 id="landing-plans" class="lp-h2" data-reveal>Revisar é de graça. Pra sempre.</h2>
      <p class="lp-lead" data-testid="landing-plans-lead">{{ landingPlansLead(catalog) }}</p>

      <div v-if="free && paid" class="lp-plans" data-testid="landing-plans">
        <div class="lp-plan">
          <h3>{{ free.name }}</h3>
          <p class="price num">{{ formatPrice(0).replace(/,00$/, '') }}</p>
          <p class="alt">Sem cartão, sem prazo</p>
          <ul>
            <li v-for="line in freeLines" :key="line">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7" /></svg>
              <span>{{ line }}</span>
            </li>
          </ul>
          <div class="spacer" />
          <LandingCta to="/comecar" position="plans_free" tone="ghost" section>Começar grátis</LandingCta>
        </div>
        <div class="lp-plan" data-paid="true">
          <h3 data-testid="landing-plan-paid-name">{{ paid.name }}</h3>
          <p v-if="paid.prices.monthly" class="price num" data-testid="landing-plan-paid-price">{{ formatPrice(paid.prices.monthly.amount_cents) }} <small>por mês</small></p>
          <p v-if="annual" class="alt" data-testid="landing-plan-paid-annual">
            <!-- The annual offer of the catalog: the monthly share is an equivalence, never a charge (decisão do dono, 08/11) -->
            ou {{ annual.offer_line || `${formatPrice(annual.amount_cents)} por ano` }}
          </p>
          <ul>
            <li v-for="line in paidLines" :key="line">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7" /></svg>
              <span>{{ line }}</span>
            </li>
          </ul>
          <div class="spacer" />
          <!-- "Assinatura em breve" (checkout.available false): start free; the prices stay above -->
          <LandingCta v-if="checkoutAvailable(catalog)" to="/planos" position="plans_pro" section>Ver o {{ paid.name }} em detalhe</LandingCta>
          <LandingCta v-else to="/comecar" position="plans_pro" section>Começar grátis</LandingCta>
        </div>
      </div>
      <div v-else-if="failed" class="lp-plans-state" role="status">
        <p>Não deu para carregar os preços agora.</p>
        <p><button type="button" class="lp-btn lp-btn-ghost lp-btn-sm" @click="emit('retry')">Tentar de novo</button></p>
      </div>
      <div v-else class="lp-plans-state" aria-busy="true" aria-label="Carregando os planos">
        <UiSkeleton variant="block" size="lg" />
        <UiSkeleton variant="block" size="lg" />
      </div>

      <p v-if="free && paid && trialTerms" class="lp-fine lp-trial-terms" data-testid="landing-plans-trial">{{ trialTerms }}</p>

      <p class="lp-compare"><NuxtLink to="/planos" class="lp-link">Ver a comparação completa</NuxtLink></p>

      <div class="lp-faq">
        <details v-for="faq in landingFaqs(catalog)" :key="faq.q">
          <summary>{{ faq.q }}</summary>
          <p>{{ faq.a }}</p>
        </details>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
// Plans and questions (prd-landing-d RF-D9, §5.2): two cards of 5 lines, centered, only from the catalog (prices,
// trial, the name of the paid plan); the long comparison lives in /planos. The paid card is the section's purple.
import type { PlanCatalog } from '~/types'
import { landingFaqs, landingPlanLines, landingPlansLead, landingTrialTerms } from '~/utils/landing'
import { checkoutAvailable } from '~/utils/checkout'

const props = defineProps<{ catalog: PlanCatalog | null, failed: boolean }>()
const emit = defineEmits<{ retry: [] }>()

const { formatPrice } = usePlans()
const free = computed(() => props.catalog?.plans?.find(p => p.key === 'free') ?? null)
const paid = computed(() => props.catalog?.plans?.find(p => p.key === 'pro') ?? null)
const annual = computed(() => paid.value?.prices.annual ?? null)
const freeLines = computed(() => landingPlanLines(props.catalog, 'free'))
const paidLines = computed(() => landingPlanLines(props.catalog, 'pro'))
// The trial's quotas, e-mail and what it leaves out, from the catalog (the same text of /planos)
const trialTerms = computed(() => landingTrialTerms(props.catalog))
</script>
