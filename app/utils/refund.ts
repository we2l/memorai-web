// The reasons of the refund asked from the screen (API: App\Domain\Payment\Enums\RefundReason).
export type RefundReason = 'not_used_enough' | 'too_expensive' | 'missing_feature' | 'bought_by_mistake' | 'other'

export interface RefundRequest {
  reason: RefundReason
  reason_detail: string | null
}

export const REFUND_DETAIL_MAX = 500

export const REFUND_REASONS: { value: RefundReason; label: string }[] = [
  { value: 'not_used_enough', label: 'Não usei o suficiente' },
  { value: 'too_expensive', label: 'Achei caro' },
  { value: 'missing_feature', label: 'Faltou algo que eu precisava' },
  { value: 'bought_by_mistake', label: 'Comprei por engano' },
  { value: 'other', label: 'Outro' },
]

/** The API refused the screen refund: only the account's first purchase is refunded there (the rest by support). */
export function isRefundViaSupport(e: unknown): boolean {
  const err = e as { data?: { code?: string }; response?: { _data?: { code?: string } } } | null
  return (err?.data?.code ?? err?.response?._data?.code) === 'refund_via_support'
}

