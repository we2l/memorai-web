<template>
  <div class="mx-auto flex max-w-4xl flex-col gap-section px-gutter pt-8 lg:pt-12">
    <UiPageHeader title="Planos" :meta="`Cadernos, notas e revisão são grátis. A IA é do ${proName}.`" />

    <PlansPlanCards v-model:period="period" @toggle="onToggle">
      <template #free-action>
        <UiButton v-if="!user" block to="/criar-conta?redirect=/planos">Criar conta grátis</UiButton>
        <PlansCurrentPlan v-else-if="currentPlan === 'free'" />
      </template>

      <template #pro-action>
        <!-- Checkout closed ("Assinatura em breve"): the visitor starts free; a signed-in account only sees the notice -->
        <UiButton v-if="!user && !checkoutOpen" variant="primary" block to="/criar-conta?redirect=/planos" data-testid="plan-start-free">Começar grátis</UiButton>
        <UiButton v-else-if="!user" variant="primary" block to="/criar-conta?redirect=/planos">Criar conta para assinar</UiButton>

        <!-- Annual running: validity + renewal (RN-09) or monthly scheduling at D-7 (RN-08) -->
        <div v-else-if="isAnnual" class="flex flex-col gap-2">
          <p class="text-meta font-semibold text-fg-strong" data-testid="annual-valid-until">
            Seu anual vale até {{ formatBillingDate(subscription.info?.plan_expires_at) }}
          </p>
          <PlansCheckoutSoon v-if="!checkoutOpen" />
          <template v-else-if="isYearly">
            <UiButton v-if="subscription.info?.can_renew_annual" variant="primary" block :loading="loading" @click="subscribe">Renovar anual</UiButton>
            <template v-else>
              <UiButton block disabled>Renovar</UiButton>
              <p class="text-meta text-fg-muted">A renovação abre {{ ANNUAL_RENEWAL_WINDOW_DAYS }} dias antes do fim.</p>
            </template>
          </template>
          <UiButton v-else-if="canScheduleMonthly" block :loading="loading" @click="subscribe">Agendar mensal para depois do anual</UiButton>
          <PlansCurrentPlan v-else />
        </div>

        <PlansCurrentPlan v-else-if="currentPlan === 'pro'" />
        <PlansCheckoutSoon v-else-if="!checkoutOpen" />
        <UiButton v-else variant="primary" block :loading="loading" @click="subscribe">{{ isYearly ? 'Assinar anual' : `Assinar ${proName}` }}</UiButton>
        <!-- The trial of the catalog (prd-planos-lancamento RF-F4): offered, running, or nothing once used -->
        <p v-if="trialLine" class="mt-2 text-meta text-fg-muted" data-testid="plan-trial">{{ trialLine }}</p>
      </template>
    </PlansPlanCards>

    <UiSection v-if="subscription.info?.has_subscription" title="Sua assinatura" description="Cancelar, trocar cartão ou ver faturas" data-testid="plan-manage">
      <template #action>
        <UiButton v-if="checkoutOpen" :loading="loading" @click="openPortal">Gerenciar assinatura</UiButton>
      </template>
      <!-- Monthly → annual: the annual starts when the paid month ends (RN-07) -->
      <UiButton v-if="checkoutOpen && subscription.info?.billing === 'monthly' && pro?.prices.annual" variant="ghost" size="sm" :loading="loading" @click="switchToAnnual">
        Mudar para anual e economizar {{ formatPrice(pro.prices.annual.savings_cents ?? 0) }}
      </UiButton>
    </UiSection>

    <PlansPlanCompareTable />

    <UiSection title="Perguntas sobre cobrança" flush class="px-5 pt-5 pb-1 sm:px-6 sm:pt-6" data-testid="plan-faq">
      <div class="divide-y divide-line">
        <details v-for="faq in FAQS" :key="faq.q" class="group">
          <summary class="flex min-h-touch cursor-pointer list-none items-center justify-between gap-3 py-2 text-body font-semibold text-fg-strong">
            {{ faq.q }}
            <ChevronDown class="size-4 shrink-0 text-fg-muted transition-transform duration-nav group-open:rotate-180" aria-hidden="true" />
          </summary>
          <p class="pb-4 text-body text-fg">{{ faq.a }}</p>
        </details>
      </div>
    </UiSection>
  </div>
</template>

<script setup lang="ts">
// /planos v4 (prd-4h-landing-v3 RF-F12): one layout, signed in or not; every price and limit from GET /api/plans
// (RN-01). Prerendered: while hydrating, Nuxt takes the query out of the route and gives it back right after, so
// the links (?ciclo=, ?success=, ?renovar=) follow router.currentRoute, like /entrar.
import { ChevronDown } from 'lucide-vue-next'
import type { BillingPeriod } from '~/components/plans/BillingToggle.vue'

definePageMeta({ layout: 'public', quietHeaderCta: true })

useHead({ title: 'Planos · Baigi' })

const router = useRouter()
const toast = useToast()
const auth = useAuthStore()
const subscription = useSubscriptionStore()
const user = useHydratedUser()
const { track } = useAnalytics()
const checkout = useCheckout()
const checkoutOpen = checkout.available
const loading = checkout.pending
const query = computed(() => router.currentRoute.value.query)
// Annual is the default offer (RF-20); ?ciclo=mensal forces the monthly
const period = ref<BillingPeriod>('annual')
watch(() => query.value.ciclo, (ciclo) => { period.value = ciclo === 'mensal' ? 'monthly' : 'annual' }, { immediate: true })

const { fetchPlans, limitOf, formatPrice } = usePlans()
const pro = computed(() => limitOf('pro'))
const isYearly = computed(() => period.value === 'annual' && !!pro.value?.prices.annual)
const currentPlan = computed(() => user.value?.plan || 'free')
const isAnnual = computed(() => subscription.isAnnual)
const canScheduleMonthly = computed(() => {
  const info = subscription.info
  return !!info && !info.has_subscription && daysUntil(info.plan_expires_at) <= MONTHLY_SWITCH_WINDOW_DAYS
})

const proName = useProName()
const { plans } = usePlans()
const trial = computed(() => offeredTrial(plans.value))
// "No teste: 20 gerações de cards com IA, 30 perguntas…" (catalog trial.limits, for the whole trial)
const trialQuotas = computed(() => trialLimitsText(plans.value))

/** The trial's line under the paid plan's action: the days of the catalog, never written by hand. */
const trialLine = computed(() => {
  const t = trial.value
  const u = user.value
  // Signed in only: the visitor sees the trial in the questions (a line under the button would push the layout)
  if (!t || !u || u.plan === 'pro') return ''
  if (u.trial?.status === 'active') return `${trialEndsLine(proName.value, u.trial.ends_at)}.`
  if (u.trial?.status === 'available') return `Ou teste ${t.days} dias grátis, sem cartão: começa quando você mandar o primeiro material.`
  return ''
})

const FAQS = computed(() => [
  ...(checkoutOpen.value ? [] : [{ q: 'Já dá para assinar?', a: `Ainda não: o pagamento abre em breve. Até lá, nada é cobrado, e cadernos, notas e revisão seguem grátis.` }]),
  ...(trial.value
    ? [{ q: 'Como funciona o teste grátis?', a: `Ao mandar o primeiro material (um PDF ou uma nota), com o e-mail confirmado, você ganha ${trial.value.days} dias do ${proName.value}, sem cartão.${trialQuotas.value ? ` No teste: ${trialQuotas.value}.` : ''} Depois, a conta volta sozinha ao Grátis, sem cobrança.` }]
    : []),
  { q: 'Posso cancelar quando quiser?', a: `Sim. Cancele quando quiser, pelo portal de assinatura. O ${proName.value} continua até o fim do período já pago.` },
  { q: 'Como funciona o plano anual?', a: 'É um pagamento único, no Pix ou no cartão, que vale por um ano. Não renova sozinho: avisamos por e-mail antes de vencer.' },
  { q: 'Como funciona o plano mensal?', a: 'É cobrado no cartão e renova sozinho a cada mês, até você cancelar.' },
  { q: 'O que acontece se eu voltar para o Grátis?', a: `Seus cadernos, notas e cards continuam com você, e a revisão segue grátis. A IA fica no ${proName.value}.` },
])

function onToggle(value: BillingPeriod) {
  track('plans_toggle', { period: value })
  // In the address: a link or a reload keeps the choice
  void router.replace({ query: { ...query.value, ciclo: value === 'monthly' ? 'mensal' : 'anual' } })
}

function startCheckout(annual: boolean) {
  return checkout.run(
    () => (annual ? subscription.checkoutAnnual() : subscription.checkoutSubscription('pro', 'monthly')),
    { error: 'Não foi possível abrir o checkout. Tente de novo.', serverMessage: true },
  )
}

function subscribe() {
  const billing = isYearly.value ? 'annual' : 'monthly'
  track('upgrade_clicked', { feature: null, billing, source: 'planos_page' })
  track('plans_checkout_click', { period: billing })
  return startCheckout(isYearly.value)
}

function switchToAnnual() {
  track('upgrade_clicked', { feature: null, billing: 'annual', source: 'planos_page' })
  track('plans_checkout_click', { period: 'annual' })
  return startCheckout(true)
}

function openPortal() {
  return checkout.run(() => subscription.openPortal(), { error: 'Não foi possível abrir o portal de assinatura. Tente de novo.' })
}

// The links of the Stripe return and of the expiry e-mails: once, with the session known and the query back
const statusLoaded = ref(false)
let linkHandled = false
watch([statusLoaded, () => router.currentRoute.value.fullPath], () => {
  const q = query.value
  if (!statusLoaded.value || linkHandled || !Object.keys(q).length) return
  linkHandled = true
  if (q.success === '1') toast.show(`Assinatura ativada! Bem-vindo ao ${proName.value}.`, 'success')
  if (q.canceled === '1') toast.show('Pagamento cancelado.', 'info')
  // Renewal link from the expiry e-mails: open the annual checkout right away
  if (q.ciclo === 'anual' && q.renovar === '1' && checkoutOpen.value && (subscription.info?.can_renew_annual ?? true)) startCheckout(true)
})

onMounted(async () => {
  track('paywall_viewed', { feature: null, source: 'planos_page', plan_required: 'pro' })
  void fetchPlans()
  if (!auth.user) return // anonymous visitor: only the public catalog

  await subscription.fetchStatus().catch((e: unknown) => reportApiError(e, { silent: true }))

  try {
    const { $api } = useNuxtApp()
    const res = await $api<{ data: any }>('/me')
    if (res.data) auth.setUser(res.data)
  } catch (e) {
    reportApiError(e, { silent: true })
  }
  statusLoaded.value = true
})
</script>
