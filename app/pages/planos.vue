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

        <!-- Prepaid running (annual or 30-day Pix): validity + what may be bought on top (RN-05) -->
        <div v-else-if="isPrepaid" class="flex flex-col gap-2">
          <p class="text-meta font-semibold text-fg-strong" data-testid="annual-valid-until">
            {{ subscription.info?.billing === 'monthly_pix' ? 'Seus 30 dias valem' : 'Seu anual vale' }} até {{ formatBillingDate(subscription.info?.plan_expires_at) }}
          </p>
          <PlansCheckoutSoon v-if="!checkoutOpen" />
          <UiButton v-else-if="canBuyCurrent" variant="primary" block :to="checkoutPath">{{ isYearly ? 'Renovar anual' : 'Mais 30 dias no Pix' }}</UiButton>
          <template v-else-if="isYearly">
            <UiButton block disabled>Renovar</UiButton>
            <p class="text-meta text-fg-muted">A renovação abre {{ ANNUAL_RENEWAL_WINDOW_DAYS }} dias antes do fim.</p>
          </template>
          <PlansCurrentPlan v-else />
        </div>

        <PlansCurrentPlan v-else-if="currentPlan === 'pro' && !(isYearly && canBuy?.annual)" />
        <PlansCheckoutSoon v-else-if="!checkoutOpen" />
        <UiButton v-else variant="primary" block :to="checkoutPath" data-testid="plan-subscribe" @click="subscribe">{{ isYearly ? 'Assinar anual' : `Assinar ${proName}` }}</UiButton>
        <!-- The trial of the catalog (prd-planos-lancamento RF-F4): offered, running, or nothing once used -->
        <p v-if="planLine" class="mt-2 text-meta text-fg-muted" data-testid="plan-trial">{{ planLine }}</p>
      </template>
    </PlansPlanCards>

    <UiSection v-if="subscription.info?.has_subscription" title="Sua assinatura" description="Trocar cartão, cancelar ou pedir reembolso" data-testid="plan-manage">
      <template #action>
        <UiButton to="/configuracoes#plano">Gerenciar</UiButton>
      </template>
    </UiSection>

    <PlansPlanCompareTable />

    <UiSection title="Perguntas sobre cobrança" flush class="px-5 pt-5 pb-1 sm:px-6 sm:pt-6" data-testid="plan-faq">
      <div class="divide-y divide-hairline">
        <details v-for="faq in FAQS" :key="faq.q" class="group">
          <summary class="flex min-h-touch cursor-pointer list-none items-center justify-between gap-3 py-2 text-body font-semibold text-fg-strong">
            {{ faq.q }}
            <ChevronDown class="size-4 shrink-0 text-fg-muted transition-transform duration-fast group-open:rotate-180" aria-hidden="true" />
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
import { annualCardLine } from '~/utils/checkoutState'
import type { BillingPeriod } from '~/components/plans/BillingToggle.vue'

definePageMeta({ layout: 'public', quietHeaderCta: true })

useHead({ title: 'Planos · Baigi' })

const router = useRouter()
const auth = useAuthStore()
const subscription = useSubscriptionStore()
const user = useHydratedUser()
const { track } = useAnalytics()
const checkoutOpen = useCheckout().available
const query = computed(() => router.currentRoute.value.query)
// Annual is the default offer (RF-20); ?ciclo=mensal forces the monthly
const period = ref<BillingPeriod>('annual')
watch(() => query.value.ciclo, (ciclo) => { period.value = ciclo === 'mensal' ? 'monthly' : 'annual' }, { immediate: true })

const { fetchPlans, limitOf, formatPrice } = usePlans()
const pro = computed(() => limitOf('pro'))
const isYearly = computed(() => period.value === 'annual' && !!pro.value?.prices.annual)
const currentPlan = computed(() => user.value?.plan || 'free')
const isPrepaid = computed(() => subscription.isPrepaid)
const canBuy = computed(() => subscription.info?.can_buy)
/** The prepaid may stack: a new annual inside its renewal window, or 30 more days on Pix */
const canBuyCurrent = computed(() => (isYearly.value ? !!canBuy.value?.annual : !!canBuy.value?.monthly_pix))
const checkoutPath = computed(() => (isYearly.value
  ? '/checkout?plano=anual'
  : isPrepaid.value ? '/checkout?plano=mensal&metodo=pix' : '/checkout?plano=mensal'))

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

// The Free's preview of the AI in place of the trial (prd-uso-justo §9): the API's sentence, never by hand
const preview = computed(() => catalogPreview(plans.value))
const planLine = computed(() => {
  if (trialLine.value) return trialLine.value
  const u = user.value
  return preview.value && u && u.plan !== 'pro' ? 'No Grátis, a IA tem uma prévia, uma vez por conta e sem prazo.' : ''
})

const FAQS = computed(() => [
  ...(checkoutOpen.value ? [] : [{ q: 'Já dá para assinar?', a: `Ainda não: o pagamento abre em breve. Até lá, nada é cobrado, e cadernos, notas e revisão seguem grátis.` }]),
  ...(trial.value
    ? [{ q: 'Como funciona o teste grátis?', a: `Ao mandar o primeiro material (um PDF ou uma nota), com o e-mail confirmado, você ganha ${trial.value.days} dias do ${proName.value}, sem cartão.${trialQuotas.value ? ` No teste: ${trialQuotas.value}.` : ''} Depois, a conta volta sozinha ao Grátis, sem cobrança.` }]
    : preview.value
      ? [{ q: 'Como funciona a prévia grátis?', a: `${preview.value.text} Não pede cartão e não expira${preview.value.requires_verified_email ? '; pede o e-mail confirmado' : ''}. Depois, a IA fica no ${proName.value}, com cota todo mês.` }]
      : []),
  { q: 'Posso cancelar quando quiser?', a: `Sim, em Configurações, em dois cliques. O cartão não é mais cobrado, e o ${proName.value} continua até o fim do mês já pago.` },
  { q: 'Como funciona o plano anual?', a: `É um pagamento único que vale por um ano: ${annualPayLine.value}. Não renova sozinho: avisamos por e-mail antes de vencer.` },
  { q: 'Como funciona o plano mensal?', a: `No cartão, é cobrado todo mês até você cancelar. No Pix, você paga ${pixDays.value} dias de uma vez, sem renovação automática, e avisamos 3 dias antes de acabar.` },
  { q: 'E se eu me arrepender?', a: `Você tem ${refundDays.value} dias, a contar do pagamento, para pedir o reembolso total. Na primeira compra da conta, é em Configurações; nas seguintes, pelo e-mail do suporte. O valor volta para o cartão ou para a conta do Pix.` },
  { q: 'O que acontece se eu voltar para o Grátis?', a: `Seus cadernos, notas e cards continuam com você, e a revisão segue grátis. A IA fica no ${proName.value}${preview.value ? ', e o que sobrar da prévia continua seu' : ''}.` },
])

const pixDays = computed(() => pro.value?.prices.monthly?.pix_days ?? 30)
const refundDays = computed(() => plans.value?.checkout?.refund_window_days ?? 7)
const annualPayLine = computed(() => {
  const annual = pro.value?.prices.annual
  if (!annual) return 'no Pix ou no cartão'
  const card = `${formatPrice(annual.amount_cents)} no cartão, ${annualCardLine(annual)} (cada opção mostra a parcela e o total antes de confirmar)`
  return annual.pix ? `${card}, ou ${formatPrice(annual.pix.amount_cents)} no Pix, com ${annual.pix.discount_percent}% de desconto` : card
})

function onToggle(value: BillingPeriod) {
  track('plans_toggle', { period: value })
  // In the address: a link or a reload keeps the choice
  void router.replace({ query: { ...query.value, ciclo: value === 'monthly' ? 'mensal' : 'anual' } })
}

function subscribe() {
  const billing = isYearly.value ? 'annual' : 'monthly'
  track('upgrade_clicked', { feature: null, billing, source: 'planos_page' })
  track('plans_checkout_click', { period: billing })
}

// Old renewal links (e-mails sent before the Mercado Pago): ?renovar=1 opens the checkout of that plan
const statusLoaded = ref(false)
let linkHandled = false
watch([statusLoaded, () => router.currentRoute.value.fullPath], () => {
  const q = query.value
  if (!statusLoaded.value || linkHandled || !Object.keys(q).length) return
  linkHandled = true
  if (q.renovar === '1' && checkoutOpen.value) void router.replace(q.ciclo === 'mensal' ? '/checkout?plano=mensal&metodo=pix' : '/checkout?plano=anual')
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
