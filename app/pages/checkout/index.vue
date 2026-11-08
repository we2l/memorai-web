<template>
  <div class="mx-auto flex max-w-xl flex-col gap-section px-gutter pt-8 pb-12 lg:pt-12">
    <UiPageHeader :title="`Assinar o ${proName}`" :meta="plan === 'annual' ? 'Plano anual' : 'Plano mensal'" :back="{ to: '/planos', label: 'Planos' }" />

    <!-- Closed ("Assinatura em breve"): nothing to pay yet -->
    <UiSection v-if="plans && !checkoutOpen" data-testid="checkout-closed">
      <PlansCheckoutSoon />
    </UiSection>

    <UiSection v-else-if="blocked" data-testid="checkout-blocked">
      <p class="text-body text-fg">Você já tem o {{ proName }} por aqui, e esta compra cobraria duas vezes.</p>
      <template #action>
        <UiButton to="/configuracoes#plano">Ver o meu plano</UiButton>
      </template>
    </UiSection>

    <template v-else>
      <!-- What is being bought: the number in black, the one purple is the paying button (ADR-027) -->
      <UiSection :title="productName(product, proName)" data-testid="checkout-summary">
        <UiSkeleton v-if="price === null" variant="text" :lines="2" />
        <template v-else>
          <p class="text-page-title tabular-nums text-fg-strong" data-testid="checkout-price">{{ formatBrl(price) }}</p>
          <!-- The Pix discount, visible on both tabs (Lei 13.455/2017) -->
          <p v-if="annualPix && product === 'annual_pix'" class="text-meta font-semibold text-fg-strong" data-testid="checkout-pix-discount">
            {{ annualPix.discount_percent }}% de desconto no Pix: {{ formatBrl(annualCard ?? 0) }} no cartão.
          </p>
          <p v-else-if="annualPix" class="text-meta font-semibold text-fg-strong" data-testid="checkout-pix-discount">
            ou Pix {{ formatBrl(annualPix.amount_cents) }} ({{ annualPix.discount_percent }}% de desconto).
          </p>
          <p class="mt-1 text-meta text-fg-muted">{{ productTerms(product, plans) }}</p>
        </template>
      </UiSection>

      <UiSection flush class="px-5 pt-2 pb-5 sm:px-6">
        <UiTabs v-model="method" :tabs="methodTabs" label="Forma de pagamento">
          <!-- Card: the gateway's form; the Baigi only gets a single-use token -->
          <div v-if="method === 'card'" class="flex flex-col gap-4">
            <template v-if="payment && view !== 'rejected'">
              <div v-if="view === 'challenge'" class="flex flex-col gap-3" data-testid="checkout-challenge">
                <p class="text-body text-fg">O banco pediu uma confirmação. Siga as instruções abaixo; o {{ proName }} libera aqui quando ela terminar.</p>
                <iframe :src="payment.challenge_url ?? undefined" title="Confirmação do banco" class="h-[70dvh] w-full rounded-row border border-line" />
              </div>
              <p v-else class="flex items-center gap-2 text-body text-fg" role="status" data-testid="checkout-processing">
                <UiSpinner size="sm" /> {{ payment.message ?? 'Pagamento em análise. Avisamos aqui assim que for aprovado.' }}
              </p>
            </template>
            <template v-else>
              <p v-if="cardError" class="rounded-control bg-danger-subtle px-3 py-2 text-meta text-danger" role="alert" data-testid="checkout-card-error">{{ cardError }}</p>
              <p v-if="plan === 'monthly'" class="text-meta text-fg-muted">A primeira cobrança aparece no cartão em até uma hora. Antes, o Mercado Pago faz uma validação de valor mínimo e a devolve.</p>
              <CheckoutCardBrick
                v-if="publicKey && price !== null"
                :key="`${product}-${price}`"
                :public-key="publicKey"
                :amount="price / 100"
                :email="auth.user?.email"
                :max-installments="plan === 'annual' ? installmentsMax : 1"
                :pay="payWithCard"
              />
            </template>
          </div>

          <!-- Pix: QR on this screen, polled on our endpoint -->
          <div v-else class="flex flex-col gap-4">
            <CheckoutPixPanel
              v-if="payment"
              :payment="payment"
              :seller-name="sellerName"
              :expired="view === 'expired'"
              :loading="pix.pending.value"
              @regenerate="startPix"
            />
            <template v-else>
              <p v-if="plan === 'monthly'" class="text-meta text-fg-muted">São {{ pixDays }} dias de acesso, pagos uma vez. Não renova sozinho: avisamos 3 dias antes, com um botão para renovar no Pix.</p>
              <UiButton variant="primary" block :loading="pix.pending.value" data-testid="checkout-pix-start" @click="startPix">
                Gerar Pix de {{ price === null ? '' : formatBrl(price) }}
              </UiButton>
            </template>
          </div>
        </UiTabs>
      </UiSection>

      <CheckoutSellerNote :method="method" />
    </template>
  </div>
</template>

<script setup lang="ts">
// Checkout transparente do Mercado Pago (prd-pagamento-mercado-pago RF-F2): the person pays inside the Baigi. Card by
// the Card Payment Brick (iframes, SAQ A), Pix by QR + copia e cola. The state shown is always the API's, read again
// every 3 s while the payment is open (usePoll); approved goes to /checkout/sucesso.
import type { CheckoutPayment } from '~/types'
import type { CardPayload } from '~/stores/subscription'
import { formatBrl, isSettled, methodFromQuery, paymentView, planFromQuery, priceOf, productName, productOf, productTerms } from '~/utils/checkoutState'
import { extractApiMessage } from '~/utils/apiErrors'
import { CHECKOUT_SOON, isCheckoutUnavailable } from '~/utils/checkout'

useHead({ title: 'Assinar · Baigi' })

const POLL_MS = 3000
const POLL_TIMEOUT_MS = 40 * 60 * 1000

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const subscription = useSubscriptionStore()
const { plans, fetchPlans } = usePlans()
const { track } = useAnalytics()
const proName = useProName()
const checkout = useCheckout()
const checkoutOpen = checkout.available
const pix = checkout

const plan = computed(() => planFromQuery(route.query.plano))
const method = ref<'card' | 'pix'>(methodFromQuery(route.query.metodo))
const product = computed(() => productOf(plan.value, method.value))
const price = computed(() => priceOf(plans.value, product.value))
const prices = computed(() => plans.value?.plans.find(p => p.key === 'pro')?.prices)
const annualCard = computed(() => prices.value?.annual?.amount_cents ?? null)
const annualPix = computed(() => (plan.value === 'annual' ? prices.value?.annual?.pix ?? null : null))
const installmentsMax = computed(() => prices.value?.annual?.installments_max ?? 1)
const pixDays = computed(() => prices.value?.monthly?.pix_days ?? 30)
const publicKey = computed(() => plans.value?.checkout?.public_key ?? null)
const sellerName = computed(() => plans.value?.checkout?.seller?.name ?? null)
// Short labels: both fit side by side at 320 px; the installments and the discount are in the summary above
const methodTabs = [
  { key: 'card', label: 'Cartão' },
  { key: 'pix', label: 'Pix' },
]

const blocked = computed(() => {
  const canBuy = subscription.info?.can_buy
  if (!canBuy) return false
  return product.value === 'monthly' ? !canBuy.monthly_card : product.value === 'monthly_pix' ? !canBuy.monthly_pix : !canBuy.annual
})

const payment = ref<CheckoutPayment | null>(null)
const now = ref(Date.now())
const view = computed(() => (payment.value ? paymentView(payment.value, now.value) : null))
const cardError = ref('')

const poller = usePoll(
  (signal) => {
    void signal
    return subscription.fetchPayment(payment.value!.id)
  },
  {
    interval: POLL_MS,
    timeout: POLL_TIMEOUT_MS,
    immediate: false,
    until: (p: CheckoutPayment) => {
      apply(p)
      return isSettled(p)
    },
  },
)

function apply(p: CheckoutPayment) {
  payment.value = p
  now.value = Date.now()
  if (p.status === 'approved') {
    poller.stop()
    void router.replace(`/checkout/sucesso?checkout=${encodeURIComponent(p.id)}`)
  } else if (p.method === 'card' && p.status === 'rejected') {
    cardError.value = p.message ?? 'O pagamento não foi aprovado. Confira os dados ou use outro cartão.'
    payment.value = null
  }
}

function follow(p: CheckoutPayment) {
  apply(p)
  if (!isSettled(p)) poller.start()
}

/** The Brick's submit: a refused card throws, so the Brick lets the person fix it and asks for a new token. */
async function payWithCard(card: CardPayload): Promise<void> {
  cardError.value = ''
  track('plans_checkout_click', { period: plan.value })
  try {
    follow(await subscription.payWithCard(plan.value, card))
  } catch (e) {
    // The checkout closed after the catalog was read: the notice in place of the form ("Assinatura em breve")
    if (isCheckoutUnavailable(e)) {
      const { plans: catalog } = usePlans()
      if (catalog.value) catalog.value = { ...catalog.value, checkout: { ...catalog.value.checkout, available: false } }
      useToast().show(extractApiMessage(e, `${CHECKOUT_SOON}.`), 'info')
    } else {
      cardError.value = extractApiMessage(e, 'Não foi possível concluir o pagamento. Tente de novo.')
    }
    throw e
  }
}

function startPix() {
  track('plans_checkout_click', { period: plan.value })
  return pix.run(async () => {
    follow(await subscription.createPix(plan.value))
  }, { error: 'Não foi possível gerar o Pix. Tente de novo em instantes.' })
}

watch(method, (value) => {
  poller.stop()
  payment.value = null
  cardError.value = ''
  void router.replace({ query: { ...route.query, metodo: value === 'pix' ? 'pix' : 'cartao' } })
})

let clock: ReturnType<typeof setInterval> | null = null

onMounted(async () => {
  clock = setInterval(() => { now.value = Date.now() }, 1000)
  await Promise.all([
    fetchPlans(),
    subscription.fetchStatus().catch((e: unknown) => reportApiError(e, { silent: true })),
  ])
  // A Pix of this product still waiting: show its QR again instead of a new one
  const open = subscription.info?.open_pix
  if (open && method.value === 'pix' && open.product === product.value) {
    subscription.fetchPayment(open.checkout_id).then(follow).catch((e: unknown) => reportApiError(e, { silent: true }))
  }
})

onBeforeUnmount(() => {
  poller.stop()
  if (clock) clearInterval(clock)
})
</script>
