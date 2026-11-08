// Kept apart from utils/guestProgress (a one-shot chunk): plugins/api.ts runs on every page.
/**
 * `first_own_material` (prd-onboarding-v4 RF-F8): once the lote is in the account, the first POST that creates the
 * person's own material (plugins/api.ts) reports it once. Only accounts that came through the visitor's lote.
 */
const FIRST_MATERIAL_KEY = 'baigi-first-material-pending'
const MATERIAL_REQUESTS: [RegExp, 'pdf' | 'note' | 'anki' | 'question'][] = [
  [/\/documents$/, 'pdf'],
  [/\/topics\/[^/]+\/notes$/, 'note'],
  [/\/import\/[^/]+\/confirm$/, 'anki'],
  [/\/pasted-questions$/, 'question'],
]

export function markFirstMaterialPending(userId: string): void {
  try {
    localStorage.setItem(FIRST_MATERIAL_KEY, userId)
  } catch {
    // no storage: the event is simply not sent
  }
}

/** The kind of material a successful request created, once per account; null otherwise. */
export function takeFirstMaterial(method: string | undefined, url: string, userId: string | undefined): 'pdf' | 'note' | 'anki' | 'question' | null {
  if ((method ?? 'GET').toUpperCase() !== 'POST' || !userId) return null
  const path = url.split('?')[0]!.replace(/\/+$/, '')
  const kind = MATERIAL_REQUESTS.find(([re]) => re.test(path))?.[1] ?? null
  if (!kind) return null
  try {
    if (localStorage.getItem(FIRST_MATERIAL_KEY) !== userId) return null
    localStorage.removeItem(FIRST_MATERIAL_KEY)
  } catch {
    return null
  }
  return kind
}
