import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import PlanCards from '~/components/plans/PlanCards.vue'
import PlanosPage from '~/pages/planos.vue'
import CheckoutPage from '~/pages/checkout/index.vue'
import { checkoutAvailable, isCheckoutUnavailable } from '~/utils/checkout'

// "Assinatura em breve": GET /plans checkout.available false and the 503 checkout_unavailable of POST /checkout/*
const { apiMock } = vi.hoisted(() => ({ apiMock: vi.fn() }))

mockNuxtImport('useNuxtApp', original => () => new Proxy(original(), {
  get: (target, key) => (key === '$api' ? apiMock : Reflect.get(target, key)),
}))

const extras = { pdf_pages_per_note: 100, rag_max_pages: 300, upload_max_mb: 50, pdf_pages_monthly_cap: 4000, quiz_max_questions: 10, quiz_short_answer: false, podcast_format: 'none', podcast_max_minutes: 0 }

function catalog(available: boolean | undefined) {
  return {
    currency: 'BRL',
    period: 'calendar_month',
    period_timezone: 'America/Sao_Paulo',
    ...(available === undefined ? {} : { checkout: { available } }),
    plans: [
      { key: 'free', name: 'Grátis', prices: { monthly: null, annual: null }, highlights: ['Cadernos sem limite'], limits: {}, extras },
      {
        key: 'pro',
        name: 'Intensivo',
        prices: {
          monthly: { amount_cents: 2990, label: 'R$ 29,90/mês' },
          annual: { amount_cents: 23990, label: 'R$ 239,90/ano', monthly_equivalent_cents: 1999, installments_max: 1, savings_cents: 11890 },
        },
        highlights: ['Tudo do Grátis'],
        limits: {},
        extras,
      },
    ],
    features: {},
  }
}

const unavailable = Object.assign(new Error('503'), {
  status: 503,
  data: { code: 'checkout_unavailable', message: 'A assinatura do Intensivo abre em breve. Nada foi cobrado.' },
})

const freeUser = { id: 'u1', name: 'Ana', email: 'ana@audit.test', plan: 'free', email_verified: true, trial: { status: 'used', started_at: null, ends_at: null } }

function routeApi(available: boolean) {
  apiMock.mockImplementation(async (url: string) => {
    if (url === '/plans') return { data: catalog(available) }
    if (url === '/subscription') return { data: { plan: 'free', has_subscription: false, billing: null } }
    if (url === '/me') return { data: useAuthStore().user }
    if (url.startsWith('/checkout/')) throw unavailable
    return { data: null }
  })
}

describe('utils/checkout', () => {
  it('aberto, a menos que o catálogo diga available false (API antiga sem o campo continua aberta)', () => {
    expect(checkoutAvailable(catalog(false) as never)).toBe(false)
    expect(checkoutAvailable(catalog(true) as never)).toBe(true)
    expect(checkoutAvailable(catalog(undefined) as never)).toBe(true)
    expect(checkoutAvailable(null)).toBe(true)
  })

  it('reconhece só o 503 com code checkout_unavailable', () => {
    expect(isCheckoutUnavailable(unavailable)).toBe(true)
    expect(isCheckoutUnavailable({ status: 503, data: { message: 'manutenção' } })).toBe(false)
    expect(isCheckoutUnavailable({ status: 500, data: { code: 'checkout_unavailable' } })).toBe(false)
  })
})

describe('assinatura em breve', () => {
  beforeEach(() => {
    useState('plans').value = null
    useState('plans-failed').value = false
    useAuthStore().user = null
    useToast().clear()
    apiMock.mockReset()
  })

  it('PlanCards: os preços continuam, com "O pagamento abre em breve."', async () => {
    useState('plans').value = catalog(false)
    const wrapper = await mountSuspended(PlanCards, { props: { period: 'annual' } })
    expect(wrapper.find('[data-testid="plan-pro-price"]').text().replace(/\s/g, ' ')).toBe('R$ 239,90/ano')
    expect(wrapper.find('[data-testid="plan-checkout-soon-note"]').text()).toBe('O pagamento abre em breve.')

    useState('plans').value = catalog(true)
    await flushPromises()
    expect(wrapper.find('[data-testid="plan-checkout-soon-note"]').exists()).toBe(false)
  })

  it('/planos sem conta: "Começar grátis" no lugar de "Criar conta para assinar"', async () => {
    routeApi(false)
    const wrapper = await mountSuspended(PlanosPage)
    await flushPromises()
    const start = wrapper.find('[data-testid="plan-start-free"]')
    expect(start.text()).toBe('Começar grátis')
    expect(start.attributes('href')).toContain('/criar-conta')
    expect(wrapper.text()).not.toContain('Criar conta para assinar')
    expect(wrapper.text()).toContain('Já dá para assinar?')
  })

  it('/planos com conta: só o aviso "Assinatura em breve", sem botão de assinar', async () => {
    useAuthStore().user = freeUser as never
    routeApi(false)
    const wrapper = await mountSuspended(PlanosPage)
    await flushPromises()
    expect(wrapper.find('[data-testid="plan-checkout-soon"]').text()).toBe('Assinatura em breve')
    expect(wrapper.findAll('button').map(b => b.text())).not.toContain('Assinar anual')
    expect(apiMock.mock.calls.some(([url]) => String(url).startsWith('/checkout/'))).toBe(false)
  })

  it('catálogo velho: o 503 vira o aviso e um toast informativo, nunca o de erro', async () => {
    useAuthStore().user = freeUser as never
    routeApi(false)
    apiMock.mockImplementation(async (url: string) => {
      if (url === '/plans') return { data: catalog(true) }
      if (url.startsWith('/checkout/')) throw unavailable
      if (url === '/me') return { data: freeUser }
      return { data: { plan: 'free', has_subscription: false, billing: null } }
    })
    const wrapper = await mountSuspended(CheckoutPage, { route: '/checkout?plano=anual&metodo=pix' })
    await flushPromises()
    await wrapper.findAll('[role="tab"]').find(t => t.text().startsWith('Pix'))!.trigger('click')
    await flushPromises()
    await wrapper.find('[data-testid="checkout-pix-start"]').trigger('click')
    await flushPromises()

    expect(apiMock).toHaveBeenCalledWith('/checkout/pix', expect.objectContaining({ method: 'POST', body: { product: 'annual' } }))
    expect(wrapper.find('[data-testid="checkout-closed"]').exists()).toBe(true)
    const toast = useToast().state.items.at(-1)
    expect(toast?.type).toBe('info')
    expect(toast?.message).toBe('A assinatura do Intensivo abre em breve. Nada foi cobrado.')
  })
})
