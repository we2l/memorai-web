import type { ApiActionOptions } from '~/composables/useApiAction'
import { extractApiMessage } from '~/utils/apiErrors'
import { CHECKOUT_SOON, checkoutAvailable, isCheckoutUnavailable } from '~/utils/checkout'

/**
 * The paying actions (checkout, renewal, portal) through useApiAction. A 503 checkout_unavailable (catalog read
 * before the checkout closed) flips the screen to "Assinatura em breve" and says so in an info toast, not an error.
 */
export function useCheckout() {
  const { plans } = usePlans()
  const action = useApiAction()
  const available = computed(() => checkoutAvailable(plans.value))

  function markUnavailable() {
    if (plans.value) plans.value = { ...plans.value, checkout: { available: false } }
  }

  function run<T>(fn: () => Promise<T>, opts: ApiActionOptions & { serverMessage?: boolean } = {}): Promise<T | undefined> {
    return action.run(async () => {
      try {
        return await fn()
      } catch (e) {
        if (isCheckoutUnavailable(e)) {
          markUnavailable()
          useToast().show(extractApiMessage(e, `${CHECKOUT_SOON}.`), 'info')
          return undefined
        }
        // The checkout puts the server's message first ("Você já está neste plano."), the caller's text as the fallback
        if (opts.serverMessage && typeof opts.error === 'string') {
          reportApiError(e, { ...opts, error: extractApiMessage(e, opts.error) })
          return undefined
        }
        throw e
      }
    }, opts)
  }

  return { available, run, pending: action.pending }
}
