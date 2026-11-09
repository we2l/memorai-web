<template>
  <UiErrorState
    v-if="failed && !catalog"
    title="Não conseguimos carregar os planos agora"
    description="Os preços e limites vêm direto do catálogo. Sem ele, não mostramos números."
    @retry="fetchPlans()"
  />

  <div v-else :aria-busy="!catalog">
    <div class="mb-5 min-h-20">
      <PlansBillingToggle v-if="pro?.prices.annual" v-model="period" :savings="savings" @update:model-value="emit('toggle', $event)" />
    </div>

    <div class="grid items-stretch gap-4 md:grid-cols-2">
      <!-- Free -->
      <UiSection :title="free?.name ?? 'Grátis'" data-testid="plan-free">
        <div class="flex h-full flex-col">
          <div class="min-h-24">
            <template v-if="free">
              <p class="num-m text-fg-strong">{{ formatPrice(free.prices.monthly?.amount_cents ?? 0) }}</p>
              <p class="mt-1 text-meta text-fg-muted">Para sempre</p>
            </template>
            <UiSkeleton v-else variant="text" :lines="2" />
          </div>
          <div class="mb-5 min-h-touch"><slot v-if="catalog" name="free-action" /></div>
          <ul v-if="catalog" class="flex flex-col gap-2.5 text-meta text-fg">
            <li v-for="line in freeLines" :key="line" class="flex gap-2"><Check class="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />{{ line }}</li>
          </ul>
          <div v-else class="flex flex-col gap-2.5"><UiSkeleton v-for="i in SKELETON_LINES.free" :key="i" variant="text" :lines="1" class="h-5 justify-center" /></div>
        </div>
      </UiSection>

      <!-- Pro: the recommendation is written, with the purple ring (E2, prd-visual-e2 RF-5.6) -->
      <UiSection :title="pro?.name ?? PRO_NAME_FALLBACK" class="ring-2 ring-action" data-testid="plan-pro">
        <template #action><UiTag tone="action">Recomendado</UiTag></template>
        <div class="flex h-full flex-col">
          <div class="min-h-24">
            <template v-if="pro?.prices.monthly">
              <!-- The annual says what is charged (once a year) and its monthly share (prd-planos-lancamento RF-F4) -->
              <p class="num-m text-fg-strong" data-testid="plan-pro-price">
                {{ formatPrice(annual ? annual.amount_cents : pro.prices.monthly.amount_cents) }}<span class="font-sans text-meta font-normal tracking-normal text-fg-muted">{{ annual ? '/ano' : '/mês' }}</span>
              </p>
              <p class="mt-1 text-meta text-fg-muted" data-testid="plan-pro-note">{{ annualCopy || monthlyCopy }}</p>
              <!-- The Pix discount, visible as such (Lei 13.455/2017) -->
              <p v-if="annual?.pix" class="mt-1 mb-4 text-meta font-semibold text-fg-strong" data-testid="plan-pro-pix">Pix {{ formatPrice(annual.pix.amount_cents) }} ({{ annual.pix.discount_percent }}% de desconto)</p>
              <!-- "Assinatura em breve": the prices stay, with when paying opens -->
              <p v-if="!checkoutOpen" class="mt-1 mb-4 text-meta font-semibold text-fg-strong" data-testid="plan-checkout-soon-note">{{ CHECKOUT_SOON_NOTE }}</p>
            </template>
            <UiSkeleton v-else variant="text" :lines="2" />
          </div>
          <div class="mb-5 min-h-touch"><slot v-if="catalog" name="pro-action" /></div>
          <ul v-if="catalog" class="flex flex-col gap-2.5 text-meta text-fg">
            <li v-for="line in proLines" :key="line" class="flex gap-2"><Check class="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />{{ line }}</li>
          </ul>
          <div v-else class="flex flex-col gap-2.5"><UiSkeleton v-for="i in SKELETON_LINES.pro" :key="i" variant="text" :lines="1" class="h-5 justify-center" /></div>
        </div>
      </UiSection>
    </div>
  </div>
</template>

<script setup lang="ts">
// Cards of the offer (prd-4h-landing-v3 RF-F11). Every price and limit comes from GET /api/plans (RN-01): while it
// loads, a skeleton of the final size and no number; when it fails, an error with "Tentar de novo". The actions of
// the cards are slots, because they depend on who is viewing (the page knows the session; the landing, when it
// comes back to the agenda, only sends to /criar-conta). `period` is the page's, for the checkout to follow it.
import { Check } from 'lucide-vue-next'
import type { BillingPeriod } from '~/components/plans/BillingToggle.vue'
import { CHECKOUT_SOON_NOTE, checkoutAvailable } from '~/utils/checkout'
import { annualCardLine } from '~/utils/checkoutState'

// One skeleton row per line of the loaded list, in the li's rhythm (20 px + gap 10): the cards keep their final height
// and nothing below them jumps (e2e planos-v3 "o esqueleto segura o layout"). Counts of the current catalog
// (config/billing.php highlights + planBenefitLines); a new line in the catalog means updating them here.
const SKELETON_LINES = { free: 6, pro: 11 }

const period = defineModel<BillingPeriod>('period', { required: true })
const emit = defineEmits<{ toggle: [period: BillingPeriod] }>()

const { plans: catalog, failed, fetchPlans, limitOf, formatPrice } = usePlans()
const free = computed(() => limitOf('free'))
const pro = computed(() => limitOf('pro'))
const checkoutOpen = computed(() => checkoutAvailable(catalog.value))
// The Free has no AI quota since the planos de lançamento: its phrases only (RF-F4); the lines of the limits
// are the fallback of a catalog without highlights
const freeLines = computed(() => (free.value?.highlights?.length ? free.value.highlights : planBenefitLines(catalog.value, 'free')))
const proLines = computed(() => [...(pro.value?.highlights ?? []), ...planBenefitLines(catalog.value, 'pro')])
const annual = computed(() => (period.value === 'annual' ? pro.value?.prices.annual ?? null : null))
const savings = computed(() => {
  const cents = pro.value?.prices.annual?.savings_cents
  return cents ? formatPrice(cents) : null
})

/**
 * "Equivale a R$ 19,99 por mês · até 3× sem juros · ou 12× com juros" (decisão do dono, 08/11): the monthly share is an
 * equivalence, never a charge or an installment; the card line is the catalog's (prd-pagamento-mercado-pago RF-F1).
 */
const annualCopy = computed(() => {
  if (!annual.value) return ''
  const monthly = annual.value.monthly_equivalent_cents ?? Math.round(annual.value.amount_cents / 12)
  return `Equivale a ${formatPrice(monthly)} por mês · ${annualCardLine(annual.value)}`
})

/** Card renews by itself; the Pix pays 30 days once. */
const monthlyCopy = computed(() => {
  const days = pro.value?.prices.monthly?.pix_days
  return days ? `No cartão, renova todo mês e cancela em dois cliques. Ou ${days} dias no Pix, sem renovação` : 'No cartão, renova todo mês e cancela em dois cliques'
})
</script>

<!-- The prices in the Fraunces of the big numbers (ADR-035 §2): the @font-face comes with this chunk -->
<style>
@import "~/assets/css/fraunces.css";
</style>
