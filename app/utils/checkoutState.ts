import type { BillingProduct, CheckoutPayment, PlanCatalog, PlanPrice } from '~/types'

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

/** "R$ 34,90" */
export function formatBrl(cents: number): string {
  return brl.format(cents / 100)
}

/** /checkout?plano=anual|mensal&metodo=cartao|pix (prd-pagamento-mercado-pago RF-F2). */
export type CheckoutPlan = 'monthly' | 'annual'
export type CheckoutMethod = 'card' | 'pix'

export function planFromQuery(value: unknown): CheckoutPlan {
  return value === 'mensal' || value === 'monthly' ? 'monthly' : 'annual'
}

export function methodFromQuery(value: unknown): CheckoutMethod {
  return value === 'pix' ? 'pix' : 'card'
}

export function productOf(plan: CheckoutPlan, method: CheckoutMethod): BillingProduct {
  if (plan === 'annual') return method === 'pix' ? 'annual_pix' : 'annual_card'
  return method === 'pix' ? 'monthly_pix' : 'monthly'
}

export function productName(product: BillingProduct, proName: string): string {
  return product === 'monthly' ? `${proName} mensal` : product === 'monthly_pix' ? `${proName} por 30 dias` : `${proName} anual`
}

/** The price charged for the product, from the catalog (RN-01); null while it is not loaded. */
export function priceOf(catalog: PlanCatalog | null | undefined, product: BillingProduct): number | null {
  const prices = catalog?.plans.find(p => p.key === 'pro')?.prices
  if (!prices) return null
  if (product === 'annual_pix') return prices.annual?.pix?.amount_cents ?? prices.annual?.amount_cents ?? null
  if (product === 'annual_card') return prices.annual?.amount_cents ?? null
  return prices.monthly?.amount_cents ?? null
}

/**
 * "até 3× sem juros · ou 12× com juros" (the catalog's, or the same rule when an older API has only the numbers).
 * The monthly share of the annual is never written as a charge or an installment.
 */
export function annualCardLine(annual: PlanPrice | null | undefined): string {
  if (!annual) return ''
  if (annual.card_line) return annual.card_line
  const max = annual.installments_max ?? 1
  const free = Math.min(max, Math.max(1, annual.installments_interest_free ?? 1))
  if (max === 1) return 'à vista no cartão'
  const parts = free > 1 ? [`até ${free}× sem juros`] : []
  if (max > free) parts.push(`${parts.length ? 'ou ' : ''}${max}× com juros`)
  return parts.join(' · ')
}

/** The line under the price: what the person gets and how it renews. */
export function productTerms(product: BillingProduct, catalog: PlanCatalog | null | undefined): string {
  const prices = catalog?.plans.find(p => p.key === 'pro')?.prices
  const max = prices?.annual?.installments_max ?? 1
  switch (product) {
    case 'monthly':
      return 'Renova sozinho todo mês no cartão. Cancele quando quiser, em dois cliques.'
    case 'monthly_pix':
      return `${prices?.monthly?.pix_days ?? 30} dias de acesso, pagos uma vez. Não renova sozinho: avisamos antes de acabar.`
    case 'annual_card':
      return max > 1
        ? `Um ano de acesso: ${annualCardLine(prices?.annual)}. Cada opção mostra o valor da parcela e o total antes de você confirmar. Não renova sozinho.`
        : 'Um ano de acesso, pago uma vez no cartão. Não renova sozinho.'
    case 'annual_pix': {
      const pix = prices?.annual?.pix
      return pix
        ? `Um ano de acesso, ${pix.discount_percent}% mais barato no Pix (${formatBrl(pix.savings_cents)} a menos). Não renova sozinho.`
        : 'Um ano de acesso, pago uma vez no Pix. Não renova sozinho.'
    }
  }
}

export type PaymentView = 'approved' | 'waiting_pix' | 'challenge' | 'processing' | 'rejected' | 'expired' | 'closed'

/** What the screen shows for a checkout (the API's state, never the gateway's). */
export function paymentView(payment: CheckoutPayment, now: number = Date.now()): PaymentView {
  switch (payment.status) {
    case 'approved':
      return 'approved'
    case 'rejected':
      return 'rejected'
    case 'expired':
    case 'canceled':
      return 'expired'
    case 'refunded':
    case 'charged_back':
      return 'closed'
    default:
      if (payment.method === 'pix') {
        const expires = payment.pix?.expires_at ? new Date(payment.pix.expires_at).getTime() : null
        if (expires !== null && now >= expires) return 'expired'
        return payment.pix ? 'waiting_pix' : 'processing'
      }
      return payment.status === 'action_required' && payment.challenge_url ? 'challenge' : 'processing'
  }
}

/** Polling stops once the checkout is settled. */
export function isSettled(payment: CheckoutPayment): boolean {
  return !['pending', 'action_required', 'processing'].includes(payment.status)
}

/** "29:59" until the Pix expires; '' without a date. */
export function remainingLabel(expiresAt: string | null | undefined, now: number = Date.now()): string {
  if (!expiresAt) return ''
  const seconds = Math.max(0, Math.floor((new Date(expiresAt).getTime() - now) / 1000))
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

/** "123.***.***-09": the seller's CPF as the Termos and the checkout show it (Decreto 7.962 asks for the number). */
export function sellerLine(catalog: PlanCatalog | null | undefined): string {
  const seller = catalog?.checkout?.seller
  if (!seller?.name) return ''
  return seller.document ? `${seller.name}, CPF ${seller.document}` : seller.name
}
