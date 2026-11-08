import type { CheckoutPayment, SubscriptionInfo } from '~/types'
import type { RefundRequest } from '~/utils/refund'

/** Card data from the Mercado Pago Brick: a single-use token, never the number (SAQ A, ADR-034). */
export interface CardPayload {
  token: string
  payment_method_id: string
  issuer_id?: string | null
  installments: number
  device_id?: string | null
  card_last_four?: string | null
  identification?: { type: string; number: string } | null
}

export const useSubscriptionStore = defineStore('subscription', {
  state: () => ({
    info: null as SubscriptionInfo | null,
  }),

  getters: {
    isPastDue: state => state.info?.subscription_status === 'past_due',
    /** Prepaid access: the annual or the 30-day Pix (both live on plan_expires_at) */
    isAnnual: state => state.info?.billing === 'annual',
    isPrepaid: state => state.info?.billing === 'annual' || state.info?.billing === 'monthly_pix',
    inGracePeriod: state => state.info?.in_grace_period === true,
  },

  actions: {
    async fetchStatus() {
      const { $api } = useNuxtApp()
      const res = await $api<{ data: SubscriptionInfo }>('/subscription')
      this.info = res.data
    },

    async payWithCard(product: 'monthly' | 'annual', card: CardPayload): Promise<CheckoutPayment> {
      const { $api } = useNuxtApp()
      const res = await $api<{ data: CheckoutPayment }>('/checkout/card', { method: 'POST', body: { product, ...card } })
      return res.data
    },

    async createPix(product: 'monthly' | 'annual'): Promise<CheckoutPayment> {
      const { $api } = useNuxtApp()
      const res = await $api<{ data: CheckoutPayment }>('/checkout/pix', { method: 'POST', body: { product } })
      return res.data
    },

    async fetchPayment(id: string): Promise<CheckoutPayment> {
      const { $api } = useNuxtApp()
      const res = await $api<{ data: CheckoutPayment }>(`/checkout/payments/${encodeURIComponent(id)}`)
      return res.data
    },

    async refund(id: string, body: RefundRequest): Promise<CheckoutPayment> {
      const { $api } = useNuxtApp()
      const res = await $api<{ data: CheckoutPayment }>(`/checkout/payments/${encodeURIComponent(id)}/refund`, { method: 'POST', body })
      await this.fetchStatus()
      return res.data
    },

    async changeCard(card: Pick<CardPayload, 'token' | 'payment_method_id' | 'card_last_four'>) {
      const { $api } = useNuxtApp()
      const res = await $api<{ data: SubscriptionInfo }>('/subscription/card', { method: 'POST', body: card })
      this.info = res.data
    },

    async cancel() {
      const { $api } = useNuxtApp()
      const res = await $api<{ data: SubscriptionInfo }>('/subscription/cancel', { method: 'POST' })
      this.info = res.data
    },
  },
})
