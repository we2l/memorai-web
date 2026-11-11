/**
 * Material falls into its matéria by the file name (prd-edital-caderno RF-F3, D5): "Direito Penal - aula 3.pdf"
 * goes to "Direito Penal". A matéria or assunto (≥ 4 letters) whose whole name the file name contains, as whole
 * words, is the match; two different matches ("Código Penal e Direito Penal") are none. No AI, no request.
 */
const MIN_LETTERS = 4

function words(text: string): string {
  return ` ${text
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\.[a-z0-9]{2,4}$/, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()} `
}

export function matchSubjectByFileName<T extends { id: string; name: string }>(fileName: string, subjects: T[]): T | null {
  const file = words(fileName)
  const found = subjects
    .map(subject => ({ subject, name: words(subject.name) }))
    .filter(m => m.name.trim().length >= MIN_LETTERS && file.includes(m.name))
  // "Direito Processual Penal" also contains "Penal": a name inside a longer match is not a match of its own
  const kept = found.filter(m => !found.some(o => o !== m && o.name.length > m.name.length && o.name.includes(m.name)))
  const ids = new Set(kept.map(m => m.subject.id))
  return ids.size === 1 ? kept[0]!.subject : null
}
