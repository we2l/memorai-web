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
              <p class="text-page-title text-fg-strong tabular-nums">{{ formatPrice(free.prices.monthly?.amount_cents ?? 0) }}</p>
              <p class="mt-1 text-meta text-fg-muted">Para sempre</p>
            </template>
            <UiSkeleton v-else variant="text" :lines="2" />
          </div>
          <div class="mb-5 min-h-touch"><slot v-if="catalog" name="free-action" /></div>
          <ul v-if="catalog" class="flex flex-col gap-2.5 text-meta text-fg">
            <li v-for="line in freeLines" :key="line" class="flex gap-2"><Check class="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />{{ line }}</li>
          </ul>
          <UiSkeleton v-else variant="text" :lines="10" />
        </div>
      </UiSection>

      <!-- Pro: the recommendation is written, and the page's only lilac block -->
      <UiSection :title="pro?.name ?? 'Pro'" variant="tinted" data-testid="plan-pro">
        <template #action><UiTag tone="action">Recomendado</UiTag></template>
        <div class="flex h-full flex-col">
          <div class="min-h-24">
            <template v-if="pro?.prices.monthly">
              <p class="text-page-title text-fg-strong tabular-nums" data-testid="plan-pro-price">
                {{ formatPrice(annual ? annual.monthly_equivalent_cents ?? 0 : pro.prices.monthly.amount_cents) }}<span class="text-meta font-normal tracking-normal text-fg-muted">/mês</span>
              </p>
              <p class="mt-1 text-meta text-fg-muted" data-testid="plan-pro-note">{{ annualCopy || 'Cancele quando quiser, pelo portal de assinatura' }}</p>
            </template>
            <UiSkeleton v-else variant="text" :lines="2" />
          </div>
          <div class="mb-5 min-h-touch"><slot v-if="catalog" name="pro-action" /></div>
          <ul v-if="catalog" class="flex flex-col gap-2.5 text-meta text-fg">
            <li v-for="line in proLines" :key="line" class="flex gap-2"><Check class="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />{{ line }}</li>
          </ul>
          <UiSkeleton v-else variant="text" :lines="10" />
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

const period = defineModel<BillingPeriod>('period', { required: true })
const emit = defineEmits<{ toggle: [period: BillingPeriod] }>()

const { plans: catalog, failed, fetchPlans, limitOf, formatPrice } = usePlans()
const free = computed(() => limitOf('free'))
const pro = computed(() => limitOf('pro'))
const freeLines = computed(() => [...(free.value?.highlights ?? []), ...planBenefitLines(catalog.value, 'free')])
const proLines = computed(() => [...(pro.value?.highlights ?? []), ...planBenefitLines(catalog.value, 'pro')])
const annual = computed(() => (period.value === 'annual' ? pro.value?.prices.annual ?? null : null))
const savings = computed(() => {
  const cents = pro.value?.prices.annual?.savings_cents
  return cents ? formatPrice(cents) : null
})

/**
 * "R$ 287,90 no Pix ou 12x de R$ 23,99 sem juros no cartão" only when the Stripe account offers
 * installments (installments_max > 1); otherwise "à vista no cartão" (prd-custo-abuso-p0 RF-7).
 */
const annualCopy = computed(() => {
  if (!annual.value) return ''
  const total = formatPrice(annual.value.amount_cents)
  const installments = annual.value.installments_max ?? 1
  return installments > 1
    ? `Um pagamento por ano: ${total} no Pix ou ${installments}x de ${formatPrice(Math.round(annual.value.amount_cents / installments))} sem juros no cartão`
    : `Um pagamento por ano: ${total} no Pix ou à vista no cartão`
})
</script>
