/** Words that never become an initial ("Direito do Trabalho" → "DT") */
const SKIP = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o', 'em', 'para', 'the', 'of'])

/**
 * Two letters for a notebook cover (A2, ADR-037): the first letter of the first word and of the next relevant one
 * ("TRF 4ª Região" → "TR", "Inglês instrumental" → "II"); one word gives its first two letters ("Anatomia" → "AN").
 * Digits and symbols are skipped; an empty name gives "".
 */
export function notebookInitials(name: string): string {
  const words = name
    .normalize('NFC')
    .split(/[\s·—–/,.:()]+/)
    // Letters only, without the ordinal marks of "4ª"; a leftover single letter is not a word
    .map(w => w.replace(/[^\p{L}]|[ªº]/gu, ''))
    .filter(w => w.length > 1 && !SKIP.has(w.toLowerCase()))
  if (!words.length) return ''
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase()
  return (words[0]![0]! + words[1]![0]!).toUpperCase()
}
