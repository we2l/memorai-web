/**
 * Size of a review batch: the person picks 10, 20 or 30 cards (Configurações → Estudo, /me.review_batch_size and
 * /settings.review_batch_size); 20 is the default. Small module on purpose: the settings chunk reads it without
 * the review store.
 */
export const REVIEW_BATCH = 20
export const REVIEW_BATCH_SIZES = [10, 20, 30] as const

/** Average time per card (ReviewService::SECONDS_PER_CARD): the minutes of the goal and of a batch. */
export const SECONDS_PER_CARD = 15

/** The batch size of the account, 20 when absent or unknown. */
export function reviewBatchSizeOf(size: number | null | undefined): number {
  return REVIEW_BATCH_SIZES.includes(size as typeof REVIEW_BATCH_SIZES[number]) ? size! : REVIEW_BATCH
}

/** "~5 min": rounded minutes of this many cards. */
export function cardsMinutes(cards: number): number {
  return Math.round((cards * SECONDS_PER_CARD) / 60)
}
