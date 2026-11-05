<template>
  <div class="flex flex-col gap-6">
    <div class="flex flex-col items-start gap-3">
      <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
        <UiPlanBadge :plan="auth.user?.plan" />
        <span v-if="planSummary" class="text-body text-fg-strong" data-testid="plan-summary">{{ planSummary }}</span>
        <span v-else-if="isFree" class="text-body text-fg-muted">Sem cobrança. O uso de IA tem limite mensal.</span>
      </div>
      <p
        v-if="subscription.inGracePeriod && !subscription.info?.monthly_scheduled"
        class="rounded-control bg-warning-subtle px-3 py-2 text-meta text-warning"
        role="status"
      >
        Seu anual venceu em {{ formatBillingDayMonth(subscription.info?.plan_expires_at) }}.
        Renove até {{ formatBillingDayMonth(subscription.info?.grace_ends_at) }} para não perder o Pro.
      </p>
      <div class="flex flex-wrap gap-2">
        <!-- The one primary of the page, only for Free (RF-F3) -->
        <UiButton v-if="isFree" variant="primary" to="/planos" data-testid="plan-upgrade">Conhecer o Pro</UiButton>
        <UiButton v-if="showRenew" :to="ANNUAL_RENEWAL_PATH">Renovar</UiButton>
        <UiButton v-if="showPortal" data-testid="plan-portal" @click="subscription.openPortal()">Gerenciar assinatura</UiButton>
      </div>
    </div>

    <div class="border-t border-line pt-5" data-testid="usage">
      <div class="mb-3 flex flex-wrap items-baseline justify-between gap-x-4">
        <h3 class="text-body font-semibold text-fg-strong">Uso de IA este mês</h3>
        <p v-if="renews" class="text-meta text-fg-muted" data-testid="usage-renews">renova em {{ renews }}</p>
      </div>

      <UiSkeleton v-if="loading" variant="text" :lines="4" />
      <p v-else-if="!rows.length" class="text-meta text-fg-muted">Não foi possível carregar o uso agora.</p>
      <ul v-else class="divide-y divide-line">
        <li v-for="row in rows" :key="row.key" class="flex flex-wrap items-center gap-x-4 gap-y-1 py-3" data-testid="usage-row">
          <span class="min-w-0 flex-1 basis-56 text-body text-fg-strong">{{ row.label }}</span>
          <UiProgressBar v-if="row.limit" class="w-32" :value="row.used" :max="row.limit" :label="`${row.label}: ${row.used} de ${row.limit} ${row.unit}`" />
          <span class="w-28 text-right text-meta text-fg-muted tabular-nums">
            <template v-if="row.limit === null"><span class="font-semibold text-fg-strong">{{ row.used }}</span> · ilimitado</template>
            <template v-else-if="row.limit === 0">no Pro</template>
            <template v-else><span class="font-semibold text-fg-strong">{{ row.used }}</span> de {{ row.limit }}</template>
          </span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
// "Plano e uso de IA" (prd-4g-conta-onboarding-v3 RF-F1, RN 5): the plan with its renewal, the way to manage
// it, and the use of the month with the labels of the catalog (GET /plans), the same of the UpgradeModal and
// the landing. There is no local map of labels: a feature outside the catalog does not show.
const auth = useAuthStore()
const subscription = useSubscriptionStore()
const { plans, fetchPlans, limitOf, formatPrice } = usePlans()
const featureUsage = useFeatureUsage()

const loading = computed(() => featureUsage.loading.value || !hasLoaded.value)
const hasLoaded = ref(false)
const isFree = computed(() => (auth.user?.plan ?? 'free') === 'free')

// Annual validity, scheduled monthly; the portal is only for the monthly (monetização RN-12)
const planSummary = computed(() => {
  // First: subscription_ends_at is not cleared by a new subscription (a past date would show)
  const renewsAt = auth.user?.subscription_renews_at
  if (renewsAt) return `Pro · renova em ${formatBillingDayMonth(renewsAt)}`
  const info = subscription.info
  if (!info?.billing) return ''
  if (info.subscription_ends_at) return `Pro · termina em ${formatBillingDayMonth(info.subscription_ends_at)}`
  if (info.billing === 'monthly') return 'Pro mensal'
  const until = formatBillingDate(info.plan_expires_at)
  if (info.monthly_scheduled) {
    const monthly = limitOf('pro')?.prices.monthly
    return `Pro anual até ${until}` + (monthly ? ` · depois, mensal ${formatPrice(monthly.amount_cents)}` : ' · depois, mensal')
  }
  return `Pro anual · válido até ${until}`
})
const showRenew = computed(() => subscription.isAnnual && !!subscription.info?.can_renew_annual && !subscription.info?.monthly_scheduled)
const showPortal = computed(() => !!subscription.info?.has_subscription)

const rows = computed(() => {
  const usage = featureUsage.usage.value?.features
  const features = plans.value?.features
  if (!usage || !features) return []
  return Object.entries(features).flatMap(([key, f]) => {
    const data = usage[key]
    if (!data) return []
    const label = f.label.charAt(0).toUpperCase() + f.label.slice(1)
    return [{ key, label, unit: f.unit, used: data.used, limit: data.limit }]
  })
})

/** The day after the last day of the period: "01/12" */
const renews = computed(() => {
  const end = featureUsage.usage.value?.period_end
  if (!end) return ''
  const d = new Date(`${end}T12:00:00`)
  d.setDate(d.getDate() + 1)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
})

onMounted(async () => {
  subscription.fetchStatus().catch((e: unknown) => reportApiError(e, { silent: true }))
  await Promise.all([fetchPlans(), featureUsage.fetchUsage()])
  hasLoaded.value = true
})
</script>
