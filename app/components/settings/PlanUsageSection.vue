<template>
  <div class="flex flex-col gap-6">
    <div class="flex flex-col items-start gap-3">
      <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
        <!-- The badge is a padded link: -ml-3 puts its pill on the edge of the section text -->
        <UiPlanBadge class="-ml-3" :plan="auth.user?.plan" />
        <span v-if="planSummary" class="text-body text-fg-strong" data-testid="plan-summary">{{ planSummary }}</span>
        <span v-else-if="isFree" class="text-body text-fg-muted">{{ trialInvite ? `Sem cobrança. ${trialInvite}.` : freeLine }}</span>
      </div>
      <p
        v-if="subscription.inGracePeriod && !subscription.info?.monthly_scheduled"
        class="rounded-control bg-warning-subtle px-3 py-2 text-meta text-warning"
        role="status"
      >
        {{ subscription.info?.billing === 'monthly_pix' ? 'Seus 30 dias venceram' : 'Seu anual venceu' }} em {{ formatBillingDayMonth(subscription.info?.plan_expires_at) }}.
        Renove até {{ formatBillingDayMonth(subscription.info?.grace_ends_at) }} para não perder o {{ proName }}.
      </p>
      <!-- The one primary of the page, only for Free (RF-F3) -->
      <UiButton v-if="isFree && !subscription.info?.refundable" variant="primary" to="/planos" data-testid="plan-upgrade">Conhecer o {{ proName }}</UiButton>
      <!-- Paying actions (change card, cancel, refund, renew): the gateway's form only loads when a sheet opens -->
      <LazySettingsBillingManage v-if="showManage" class="w-full" />
    </div>

    <div class="border-t border-line pt-5" data-testid="usage">
      <div class="mb-3 flex flex-wrap items-baseline justify-between gap-x-4">
        <h3 class="text-body font-semibold text-fg-strong">{{ onPreview ? 'Prévia grátis da IA, uma vez por conta' : `Uso de IA ${featureUsage.periodLabel.value}` }}</h3>
        <!-- In the trial the counts are of its 7 days: its end is the plan's line above (prd-planos-lancamento RF-F6) -->
        <p v-if="renews && !auth.onTrial" class="text-meta text-fg-muted" data-testid="usage-renews">a contagem recomeça em {{ renews }}</p>
      </div>

      <UiSkeleton v-if="loading" variant="text" :lines="4" />
      <p v-else-if="!rows.length" class="text-meta text-fg-muted">Não foi possível carregar o uso agora.</p>
      <ul v-else class="divide-y divide-line">
        <li v-for="row in rows" :key="row.key" class="flex flex-wrap items-center gap-x-4 gap-y-1 py-3" data-testid="usage-row">
          <span class="min-w-0 flex-1 basis-56 text-body text-fg-strong">{{ row.label }}</span>
          <UiProgressBar v-if="row.limit" class="w-32" :value="row.used" :max="row.limit" :label="`${row.label}: ${row.used} de ${row.limit} ${row.unit}`" />
          <span class="ml-auto w-28 text-right text-meta text-fg-muted tabular-nums">
            <!-- null only for what costs no AI (prd-uso-justo RN-1): just the count -->
            <template v-if="row.limit === null"><span class="font-semibold text-fg-strong">{{ row.used }}</span> {{ row.used === 1 ? 'usado' : 'usados' }}</template>
            <template v-else-if="row.limit === 0">no {{ proName }}</template>
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
const proName = useProName()
const trialInvite = useTrialInvite()
const onPreview = computed(() => featureUsage.usage.value?.period === 'lifetime')
const freeLine = computed(() => (plans.value?.preview ? 'Sem cobrança, com uma prévia grátis da IA.' : `Sem cobrança. A IA é do ${proName.value}.`))

// Annual validity, scheduled monthly; the portal is only for the monthly (monetização RN-12)
const planSummary = computed(() => {
  // One or the other, never both (a canceled subscription has only subscription_ends_at, api #134)
  const name = proName.value
  // The trial: its end in place of the renewal (prd-planos-lancamento RF-F6)
  if (auth.onTrial) return trialEndsLine(name, auth.user?.trial?.ends_at)
  const renewsAt = auth.user?.subscription_renews_at
  if (renewsAt) return `${name} · renova em ${formatBillingDayMonth(renewsAt)}`
  const info = subscription.info
  if (!info?.billing) return ''
  if (info.subscription_ends_at) return `${name} · termina em ${formatBillingDayMonth(info.subscription_ends_at)}`
  if (info.billing === 'monthly') return `${name} mensal`
  const until = formatBillingDate(info.plan_expires_at)
  if (info.billing === 'monthly_pix') return `${name} por 30 dias · válido até ${until}`
  if (info.monthly_scheduled) {
    const monthly = limitOf('pro')?.prices.monthly
    return `${name} anual até ${until}` + (monthly ? ` · depois, mensal ${formatPrice(monthly.amount_cents)}` : ' · depois, mensal')
  }
  return `${name} anual · válido até ${until}`
})
// Paying actions: hidden while the checkout is closed ("Assinatura em breve")
const checkoutOpen = computed(() => checkoutAvailable(plans.value))
const showManage = computed(() => {
  const info = subscription.info
  return checkoutOpen.value && !!info && (subscription.isPrepaid || !!info.can_change_card || !!info.can_cancel || !!info.refundable)
})

const rows = computed(() => {
  const usage = featureUsage.usage.value?.features
  const features = plans.value?.features
  if (!usage || !features) return []
  const trial = featureUsage.usage.value?.tier === 'trial'
  // The preview never resets (period lifetime, prd-uso-justo §9): its counts are "na prévia", with no reset date
  const unit = onPreview.value ? 'na prévia' : trial ? 'no teste' : null
  const out = Object.entries(features).flatMap(([key, f]) => {
    const data = usage[key]
    if (!data) return []
    const label = f.label.charAt(0).toUpperCase() + f.label.slice(1)
    return [{ key, label, unit: unit ?? f.unit, used: data.used, limit: data.limit }]
  })
  // The pages of PDF of the trial (100) or of the preview (50): "Páginas de PDF lidas pela IA · 30 de 100"
  const pages = featureUsage.usage.value?.pdf_pages
  if (unit && pages?.limit) out.push({ key: 'pdf_pages', label: 'Páginas de PDF lidas pela IA', unit, used: pages.used, limit: pages.limit })
  return out
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
