import type { SubscriptionInfo } from '~/types'

export const useSubscriptionStore = defineStore('subscription', {
  state: () => ({
    info: null as SubscriptionInfo | null,
  }),

  getters: {
    isPastDue: state => state.info?.subscription_status === 'past_due',
  },

  actions: {
    async fetchStatus() {
      const { $api } = useNuxtApp()
      const res = await $api<{ data: SubscriptionInfo }>('/subscription')
      this.info = res.data
    },

    async checkoutSubscription(priceId: string) {
      const { $api } = useNuxtApp()
      const res = await $api<{ checkout_url: string }>('/checkout/subscription', {
        method: 'POST',
        body: { price_id: priceId },
      })
      window.location.href = res.checkout_url
    },

    async checkoutAddon(addon: string) {
      const { $api } = useNuxtApp()
      const res = await $api<{ checkout_url: string }>('/checkout/addon', {
        method: 'POST',
        body: { addon },
      })
      window.location.href = res.checkout_url
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
