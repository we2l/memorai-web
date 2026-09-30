import type { CheckoutSessionInfo, SubscriptionInfo } from '~/types'

export const useSubscriptionStore = defineStore('subscription', {
  state: () => ({
    info: null as SubscriptionInfo | null,
  }),

  getters: {
    isPastDue: state => state.info?.subscription_status === 'past_due',
    isAnnual: state => state.info?.billing === 'annual',
    inGracePeriod: state => state.info?.in_grace_period === true,
  },

  actions: {
    async fetchStatus() {
      const { $api } = useNuxtApp()
      const res = await $api<{ data: SubscriptionInfo }>('/subscription')
      this.info = res.data
    },

    async checkoutSubscription(plan: string, period: string = 'monthly') {
      const { $api } = useNuxtApp()
      const res = await $api<{ checkout_url: string }>('/checkout/subscription', {
        method: 'POST',
        body: { plan, period },
      })
      window.location.href = res.checkout_url
    },

    /** One-off annual payment (Pix or card in installments) — ADR-025 */
    async checkoutAnnual() {
      const { $api } = useNuxtApp()
      const res = await $api<{ checkout_url: string; session_id: string }>('/checkout/annual', {
        method: 'POST',
      })
      window.location.href = res.checkout_url
    },

    async fetchCheckoutSession(id: string): Promise<CheckoutSessionInfo> {
      const { $api } = useNuxtApp()
      const res = await $api<{ data: CheckoutSessionInfo }>(`/checkout/sessions/${encodeURIComponent(id)}`)
      return res.data
    },

    async openPortal() {
      const { $api } = useNuxtApp()
      const res = await $api<{ portal_url: string }>('/checkout/portal', {
        method: 'POST',
      })
      window.location.href = res.portal_url
    },
  },
})
