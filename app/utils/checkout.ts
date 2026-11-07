import type { PlanCatalog } from '~/types'
import { getErrorStatus } from '~/utils/apiErrors'

/**
 * "Assinatura em breve": while no gateway is configured, GET /plans says checkout.available false and the
 * POST /checkout/* answer 503 checkout_unavailable. Prices stay on screen; only the paying action turns into a notice.
 */
export const CHECKOUT_UNAVAILABLE_CODE = 'checkout_unavailable'
export const CHECKOUT_SOON = 'Assinatura em breve'
export const CHECKOUT_SOON_NOTE = 'O pagamento abre em breve.'

/** Open unless the catalog says otherwise (an older API without the field keeps the checkout). */
export function checkoutAvailable(catalog: PlanCatalog | null | undefined): boolean {
  return catalog?.checkout?.available !== false
}

/** The 503 of a checkout that closed after the catalog was read. */
export function isCheckoutUnavailable(e: unknown): boolean {
  const err = e as { data?: { code?: string }; response?: { _data?: { code?: string } } } | null
  const code = err?.data?.code ?? err?.response?._data?.code
  return getErrorStatus(e) === 503 && code === CHECKOUT_UNAVAILABLE_CODE
}
