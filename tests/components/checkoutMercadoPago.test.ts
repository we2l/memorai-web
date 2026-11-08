import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import CheckoutPage from '~/pages/checkout/index.vue'
import BillingManage from '~/components/settings/BillingManage.vue'

// Checkout transparente do Mercado Pago (prd-pagamento-mercado-pago RF-F2, RF-F4): the API is mocked at $api, the
// screen shows only the API's state.
const { apiMock } = vi.hoisted(() => ({ apiMock: vi.fn() }))

mockNuxtImport('useNuxtApp', original => () => new Proxy(original(), {
  get: (target, key) => (key === '$api' ? apiMock : Reflect.get(target, key)),
}))

const extras = { pdf_pages_per_note: 100, rag_max_pages: 300, upload_max_mb: 50, pdf_pages_monthly_cap: 4000, quiz_max_questions: 10, quiz_short_answer: false, podcast_format: 'none', podcast_max_minutes: 0 }

const catalog = {
  currency: 'BRL', period: 'calendar_month', period_timezone: 'America/Sao_Paulo', features: {},
  checkout: { available: true, gateway: 'mercadopago', public_key: null, seller: { name: 'Fulano de Tal', document: '123.456.789-09', email: 'contato@baigi.com.br' }, statement_descriptor: 'BAIGI', refund_window_days: 7 },
  plans: [
    { key: 'free', name: 'Grátis', prices: { monthly: null, annual: null }, limits: {}, extras },
    { key: 'pro', name: 'Intensivo', limits: {}, extras, prices: {
      monthly: { amount_cents: 3490, label: 'R$ 34,90/mês', methods: ['card', 'pix'], pix_days: 30 },
      annual: { amount_cents: 23990, label: 'R$ 239,90/ano', installments_max: 12, installments_interest: 'payer', pix: { amount_cents: 22790, label: 'R$ 227,90/ano', discount_percent: 5, savings_cents: 1200 } },
    } },
  ],
}

const subscription = (over: Record<string, unknown> = {}) => ({
  plan: 'free', billing: null, subscription_status: null, subscription_ends_at: null, has_subscription: false, plan_expires_at: null,
  in_grace_period: false, grace_ends_at: null, can_renew_annual: true, monthly_scheduled: false,
  can_buy: { monthly_card: true, monthly_pix: true, annual: true }, refundable: null, open_pix: null, ...over,
})

/** Intl puts a no-break space after R$ */
const text = (s: string | null | undefined) => (s ?? '').replace(/\u00a0/g, ' ')

const pixPayment = (status = 'action_required') => ({
  id: 'chk-1', product: 'annual_pix', method: 'pix', status, status_detail: 'waiting_transfer', message: null, amount_cents: 22790,
  installments: null, challenge_url: null, paid_at: null, refundable_until: null, plan_active: status === 'approved',
  plan_expires_at: null, renews_at: null, created_at: null,
  pix: status === 'action_required' ? { qr_code: '00020126pix', qr_code_base64: 'iVBORw0KGgo=', ticket_url: null, expires_at: new Date(Date.now() + 30 * 60_000).toISOString() } : null,
})

beforeEach(() => {
  apiMock.mockReset()
  useState('plans').value = null
  useAuthStore().user = { id: 'u1', email: 'aluna@baigi.test', plan: 'free' } as never
})

describe('checkout do Mercado Pago', () => {
  it('Pix do anual: desconto visível, aviso do recebedor acima do QR, e o vendedor no rodapé', async () => {
    apiMock.mockImplementation(async (url: string) => {
      if (url === '/plans') return { data: catalog }
      if (url === '/subscription') return { data: subscription() }
      if (url === '/checkout/pix') return { data: pixPayment() }
      return { data: pixPayment() }
    })
    const wrapper = await mountSuspended(CheckoutPage)
    await flushPromises()
    await wrapper.findAll('[role="tab"]').find(t => t.text().startsWith('Pix'))!.trigger('click')
    await flushPromises()

    expect(text(wrapper.find('[data-testid="checkout-price"]').text())).toBe('R$ 227,90')
    expect(wrapper.find('[data-testid="checkout-pix-discount"]').text()).toContain('5% de desconto no Pix')
    await wrapper.find('[data-testid="checkout-pix-start"]').trigger('click')
    await flushPromises()

    expect(apiMock).toHaveBeenCalledWith('/checkout/pix', expect.objectContaining({ method: 'POST', body: { product: 'annual' } }))
    const receiver = wrapper.find('[data-testid="pix-receiver"]')
    expect(receiver.text()).toContain('No app do seu banco vai aparecer o nome do responsável pelo Baigi, Fulano de Tal, recebendo pelo Mercado Pago.')
    expect(receiver.text()).not.toContain('123.456.789-09')
    expect(receiver.find('a').attributes('href')).toBe('/quem-faz')
    expect(wrapper.find('img[alt^="QR Code do Pix"]').attributes('src')).toBe('data:image/png;base64,iVBORw0KGgo=')
    expect(wrapper.find('[data-testid="checkout-seller"]').text()).toContain('Vendido por Fulano de Tal, CPF 123.456.789-09')
  })

  it('gestão: cancelar pede confirmação e chama a API uma vez', async () => {
    apiMock.mockImplementation(async (url: string) => {
      if (url === '/plans') return { data: catalog }
      if (url === '/subscription/cancel') return { data: subscription({ plan: 'pro', billing: 'monthly', can_cancel: false }) }
      return { data: subscription() }
    })
    useState('plans').value = catalog
    useSubscriptionStore().info = subscription({ plan: 'pro', billing: 'monthly', can_cancel: true, can_change_card: true, card: { brand: 'master', last_four: '3311' }, subscription_renews_at: '2026-12-08T01:00:00-03:00' }) as never
    const wrapper = await mountSuspended(BillingManage)

    expect(wrapper.find('[data-testid="billing-card"]').text()).toBe('Cartão Mastercard final 3311')
    await wrapper.find('[data-testid="billing-cancel"]').trigger('click')
    await flushPromises()
    expect(apiMock).not.toHaveBeenCalledWith('/subscription/cancel', expect.anything())
    expect(document.body.textContent).toContain('continua até 08/12/2026')

    const confirm = [...document.querySelectorAll('button')].find(b => b.textContent?.trim() === 'Cancelar assinatura' && b !== wrapper.find('[data-testid="billing-cancel"]').element)
    confirm!.click()
    await flushPromises()
    expect(apiMock).toHaveBeenCalledWith('/subscription/cancel', expect.objectContaining({ method: 'POST' }))
    wrapper.unmount()
  })

  it('gestão: reembolso em 7 dias com o valor e para onde volta', async () => {
    useState('plans').value = catalog
    useSubscriptionStore().info = subscription({ plan: 'pro', billing: 'annual', refundable: { checkout_id: 'chk-9', product: 'annual_pix', amount_cents: 22790, until: '2026-11-15T10:00:00-03:00' } }) as never
    const wrapper = await mountSuspended(BillingManage)

    expect(wrapper.text()).toContain('Reembolso total até 15/11/2026')
    await wrapper.find('[data-testid="billing-refund"]').trigger('click')
    await flushPromises()
    expect(text(document.body.textContent)).toContain('Devolvemos R$ 227,90 para a conta de onde saiu o Pix')
    wrapper.unmount()
  })

  it('gestão: o reembolso pede o motivo num passo só e manda o motivo e o texto', async () => {
    apiMock.mockReset()
    apiMock.mockImplementation(async (url: string) => {
      if (url === '/me') return { data: null }
      if (url.endsWith('/refund')) return { data: { id: 'chk-9', status: 'refunded' } }
      return { data: subscription({ plan: 'free' }) }
    })
    useState('plans').value = catalog
    useSubscriptionStore().info = subscription({ plan: 'pro', billing: 'annual', refundable: { checkout_id: 'chk-9', product: 'annual_pix', amount_cents: 22790, until: '2026-11-15T10:00:00-03:00' } }) as never
    const wrapper = await mountSuspended(BillingManage)
    await wrapper.find('[data-testid="billing-refund"]').trigger('click')
    await flushPromises()

    expect(document.body.textContent).toContain('Por que você está pedindo o reembolso?')
    const radios = [...document.querySelectorAll<HTMLInputElement>('input[name="refund-reason"]')]
    expect(radios).toHaveLength(5)

    // Without a reason: an inline error, no call and no second dialog.
    const confirm = document.querySelector<HTMLButtonElement>('[data-testid="refund-confirm"]')!
    expect(confirm.getAttribute('form')).toBe(document.querySelector('form')!.id)
    document.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit', { cancelable: true }))
    await flushPromises()
    expect(document.querySelector('[data-testid="refund-reason-error"]')?.textContent).toContain('Escolha um motivo')
    expect(apiMock).not.toHaveBeenCalledWith(expect.stringContaining('/refund'), expect.anything())

    radios[2]!.click()
    const detail = document.querySelector<HTMLTextAreaElement>('[data-testid="refund-detail"] textarea, textarea')!
    detail.value = '  Faltou importar do Quizlet.  '
    detail.dispatchEvent(new Event('input'))
    await flushPromises()
    document.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit', { cancelable: true }))
    await flushPromises()

    expect(apiMock).toHaveBeenCalledWith('/checkout/payments/chk-9/refund', expect.objectContaining({
      method: 'POST', body: { reason: 'missing_feature', reason_detail: 'Faltou importar do Quizlet.' },
    }))
    wrapper.unmount()
  })

  it('gestão: na segunda compra, sem botão e com o e-mail do suporte', async () => {
    useState('plans').value = catalog
    useSubscriptionStore().info = subscription({
      plan: 'pro', billing: 'monthly_pix', refundable: null,
      refund_via_support: { checkout_id: 'chk-2', product: 'monthly_pix', amount_cents: 3490, until: '2026-11-15T10:00:00-03:00', email: 'contato@baigi.com.br' },
    }) as never
    const wrapper = await mountSuspended(BillingManage)

    expect(wrapper.find('[data-testid="billing-refund"]').exists()).toBe(false)
    const line = wrapper.find('[data-testid="billing-refund-support"]')
    expect(text(line.text())).toContain('Para pedir reembolso desta compra, escreva para contato@baigi.com.br em até 7 dias (até 15/11/2026).')
    expect(line.find('a').attributes('href')).toBe('mailto:contato@baigi.com.br')
    wrapper.unmount()
  })
})
