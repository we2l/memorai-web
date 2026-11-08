/**
 * MercadoPago.js v2 (ADR-034), loaded only by the checkout and the card change: one <script>, one promise. The card
 * fields live in the gateway's iframes (Card Payment Brick, SAQ A): the number never touches our code nor our API.
 * Doc: checkout-bricks/card-payment-brick (unmount on leaving the screen, recreate on coming back).
 */
const SDK_URL = 'https://sdk.mercadopago.com/js/v2'

export interface BrickFormData {
  token: string
  payment_method_id: string
  issuer_id?: string | number | null
  installments: number
  transaction_amount?: number
  payer?: { email?: string; identification?: { type?: string; number?: string } }
}

export interface BrickAdditionalData {
  bin?: string
  lastFourDigits?: string
  paymentTypeId?: string
  cardholderName?: string
}

export interface BrickController {
  unmount: () => void
}

interface MercadoPagoInstance {
  bricks: () => { create: (kind: 'cardPayment', containerId: string, settings: Record<string, unknown>) => Promise<BrickController> }
}

type MercadoPagoCtor = new (publicKey: string, options?: { locale?: string }) => MercadoPagoInstance

declare global {
  interface Window {
    MercadoPago?: MercadoPagoCtor
    /** Device ID set by MercadoPago.js (doc "Recomendações de aprovação") */
    MP_DEVICE_SESSION_ID?: string
  }
}

let loading: Promise<MercadoPagoCtor> | null = null

export function loadMercadoPago(): Promise<MercadoPagoCtor> {
  if (typeof window === 'undefined') return Promise.reject(new Error('MercadoPago.js só no navegador'))
  if (window.MercadoPago) return Promise.resolve(window.MercadoPago)
  if (loading) return loading

  loading = new Promise<MercadoPagoCtor>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SDK_URL
    script.async = true
    script.onload = () => (window.MercadoPago ? resolve(window.MercadoPago) : reject(new Error('MercadoPago.js sem o construtor')))
    script.onerror = () => {
      loading = null // a later attempt (Tentar de novo) loads it again
      script.remove()
      reject(new Error('Não foi possível carregar o MercadoPago.js'))
    }
    document.head.appendChild(script)
  })
  return loading
}

let instance: { key: string; mp: MercadoPagoInstance } | null = null

export async function mercadoPago(publicKey: string): Promise<MercadoPagoInstance> {
  if (instance?.key === publicKey) return instance.mp
  const Ctor = await loadMercadoPago()
  instance = { key: publicKey, mp: new Ctor(publicKey, { locale: 'pt-BR' }) }
  return instance.mp
}

export function deviceId(): string | null {
  return typeof window === 'undefined' ? null : (window.MP_DEVICE_SESSION_ID ?? null)
}

/**
 * The Brick does not read our CSS tokens: their computed values go in customVariables (ADR-027 colours, the purple
 * only on the button). Read at mount time, so light and dark follow the theme the person sees.
 */
export function brickStyle(root: HTMLElement = document.documentElement): Record<string, unknown> {
  const css = getComputedStyle(root)
  const v = (name: string) => css.getPropertyValue(name).trim()
  const dark = root.classList.contains('dark') || root.dataset.theme === 'dark'
  const custom: Record<string, string> = {
    baseColor: v('--action'),
    textPrimaryColor: v('--fg-strong'),
    textSecondaryColor: v('--fg-muted'),
    inputBackgroundColor: v('--surface-raised'),
    formBackgroundColor: v('--surface-raised'),
    // At rest the fields have the input border; the purple is the button's (one highlight per screen)
    outlinePrimaryColor: v('--line-input'),
    outlineSecondaryColor: v('--line-strong'),
    errorColor: v('--state-danger'),
    successColor: v('--state-success'),
    fontSizeMedium: '16px',
  }
  return { theme: dark ? 'dark' : 'default', customVariables: Object.fromEntries(Object.entries(custom).filter(([, value]) => value)) }
}
