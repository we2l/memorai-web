// The visitor who pressed "Estudar isso no Baigi" without an account (prd-edital-verticalizado-publico RF-F5): the id
// of the reading waits on this device until the sign-up/login brings them back to apply it. Only what postAuthRedirect
// needs lives here (it rides the entry of /entrar and /criar-conta); saving and clearing are in publicEdital.ts.

export const EDITAL_INTENT_KEY = 'baigi-edital-intent'
/** Public page of the tool; the result of a reading is {path}/r/{id}, never indexed */
export const PUBLIC_EDITAL_PATH = '/ferramentas/edital-verticalizado'
const ULID = /^[0-9A-HJKMNP-TV-Z]{26}$/i

export const isPublicEditalId = (id: unknown): id is string => typeof id === 'string' && ULID.test(id)

export const publicEditalResultPath = (id: string) => `${PUBLIC_EDITAL_PATH}/r/${encodeURIComponent(id)}`

export function pendingEditalIntent(): string | null {
  try {
    const id = localStorage.getItem(EDITAL_INTENT_KEY)
    return isPublicEditalId(id) ? id : null
  } catch {
    // intencional: sem localStorage não há intenção guardada
    return null
  }
}
