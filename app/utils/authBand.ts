/**
 * The subline of the sign-up band for a visitor with a lote (components/auth/Split.vue): when the cards come back,
 * from the agenda of guestSummary (the deck's real intervals), the longest return first. Without the agenda (deck not
 * fetched, or of another version) a line that promises nothing it does not know. Pure.
 */
import { returnText } from '~/utils/intervalLabel'

export function guestReturnLine(agenda: { label: string, count: number }[] | null): string {
  const generic = 'Crie a conta e esses cards voltam no dia certo.'
  if (!agenda?.length) return generic
  if (agenda.length === 1) {
    const { label, count } = agenda[0]!
    return `Crie a conta e ${count === 1 ? 'ele volta' : `os ${count} voltam`} ${returnText(label)}, no dia certo.`
  }
  const parts = [...agenda].reverse().map(a => `${a.count} ${returnText(a.label)}`)
  return `Crie a conta e esses cards voltam no dia certo: ${parts.slice(0, -1).join(', ')} e ${parts.at(-1)}.`
}
