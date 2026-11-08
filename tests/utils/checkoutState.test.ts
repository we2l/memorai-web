import { describe, expect, it } from 'vitest'
import type { CheckoutPayment, PlanCatalog } from '~/types'
import { isSettled, methodFromQuery, paymentView, planFromQuery, priceOf, productOf, productTerms, remainingLabel, sellerLine } from '~/utils/checkoutState'

const catalog = {
  checkout: { available: true, seller: { name: 'Fulano de Tal', document: '123.456.789-09', email: null } },
  plans: [{ key: 'pro', prices: {
    monthly: { amount_cents: 3490, label: '', pix_days: 30 },
    annual: { amount_cents: 23990, label: '', installments_max: 12, pix: { amount_cents: 22790, label: '', discount_percent: 5, savings_cents: 1200 } },
  } }],
} as unknown as PlanCatalog

const payment = (over: Partial<CheckoutPayment>): CheckoutPayment => ({
  id: 'c1', product: 'annual_pix', method: 'pix', status: 'action_required', status_detail: null, message: null, amount_cents: 22790,
  installments: null, challenge_url: null, pix: null, paid_at: null, refundable_until: null, plan_active: false, plan_expires_at: null,
  renews_at: null, created_at: null, ...over,
})

describe('checkoutState', () => {
  it('lê o plano e o método da URL', () => {
    expect(planFromQuery('mensal')).toBe('monthly')
    expect(planFromQuery('anual')).toBe('annual')
    expect(planFromQuery(undefined)).toBe('annual')
    expect(methodFromQuery('pix')).toBe('pix')
    expect(methodFromQuery('cartao')).toBe('card')
  })

  it('casa produto e preço do catálogo, com o Pix do anual mais barato', () => {
    expect(productOf('annual', 'pix')).toBe('annual_pix')
    expect(productOf('monthly', 'pix')).toBe('monthly_pix')
    expect(priceOf(catalog, 'annual_pix')).toBe(22790)
    expect(priceOf(catalog, 'annual_card')).toBe(23990)
    expect(priceOf(catalog, 'monthly_pix')).toBe(3490)
    expect(priceOf(null, 'monthly')).toBeNull()
  })

  it('explica cada produto', () => {
    expect(productTerms('annual_pix', catalog)).toContain('5% mais barato no Pix')
    expect(productTerms('annual_card', catalog)).toContain('até 12x')
    expect(productTerms('monthly_pix', catalog)).toContain('Não renova sozinho')
    expect(productTerms('monthly', catalog)).toContain('dois cliques')
  })

  it('mostra o estado do pagamento pelo que a API diz', () => {
    const future = new Date(Date.now() + 60_000).toISOString()
    expect(paymentView(payment({ pix: { qr_code: 'x', qr_code_base64: null, ticket_url: null, expires_at: future } }))).toBe('waiting_pix')
    expect(paymentView(payment({ pix: { qr_code: 'x', qr_code_base64: null, ticket_url: null, expires_at: new Date(Date.now() - 1000).toISOString() } }))).toBe('expired')
    expect(paymentView(payment({ status: 'approved' }))).toBe('approved')
    expect(paymentView(payment({ method: 'card', challenge_url: 'https://3ds' }))).toBe('challenge')
    expect(paymentView(payment({ method: 'card', status: 'processing' }))).toBe('processing')
    expect(paymentView(payment({ method: 'card', status: 'rejected' }))).toBe('rejected')
    expect(isSettled(payment({ status: 'processing' }))).toBe(false)
    expect(isSettled(payment({ status: 'expired' }))).toBe(true)
  })

  it('conta o tempo do Pix e identifica o vendedor', () => {
    expect(remainingLabel(new Date(Date.now() + 90_500).toISOString())).toBe('1:30')
    expect(remainingLabel(null)).toBe('')
    expect(sellerLine(catalog)).toBe('Fulano de Tal, CPF 123.456.789-09')
    expect(sellerLine(null)).toBe('')
  })
})
