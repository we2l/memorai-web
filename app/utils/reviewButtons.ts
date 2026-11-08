/**
 * How the review rates a card (prd-revisao-v5-fase-a RF-F1): "Não lembrei / Lembrei" (two, the default; Again = 1 and
 * Good = 3 in the FSRS) or the 4 Anki buttons (four). /me.review_buttons and /settings.review_buttons; the API keeps
 * the rating 1–4 either way. Small module on purpose: the settings chunk reads it without the review store.
 */
export type ReviewButtonsMode = 'two' | 'four'

export function reviewButtonsOf(value: unknown): ReviewButtonsMode {
  return value === 'four' ? 'four' : 'two'
}

/** The binary keys (D2): 1 / ← "Não lembrei"; 2 / → / Space / Enter "Lembrei". null: not a rating key. */
export function binaryRatingOfKey(key: string): 1 | 3 | null {
  if (key === '1' || key === 'ArrowLeft') return 1
  if (key === '2' || key === 'ArrowRight' || key === ' ' || key === 'Enter') return 3
  return null
}

/** The keyboard line under the ratings (pointer: fine only). */
export function reviewKeysHint(mode: ReviewButtonsMode): string {
  return mode === 'two' ? '1 Não lembrei · 2 ou Espaço Lembrei' : '1 2 3 4 · Espaço mostrar'
}
