import type { AnkiImportMapping } from '~/types'
import { countOf } from '~/utils/organization'

const MAX_NAMES = 6

function names(list: { name: string }[]): string {
  const shown = list.slice(0, MAX_NAMES).map(m => m.name).join(', ')
  return list.length > MAX_NAMES ? `${shown} e mais ${list.length - MAX_NAMES}` : shown
}

/** One line per caderno of the import: "Caderno: Inglês · Matérias: Vocabulary, Grammar, Listening" (RF-F17). */
export function cadernoLines(mapping: AnkiImportMapping): string[] {
  return mapping.cadernos.map((c) => {
    const parts = [`Caderno: ${c.name}`]
    if (c.materias.length) parts.push(`${c.materias.length === 1 ? 'Matéria' : 'Matérias'}: ${names(c.materias)}`)
    const assuntos = c.materias.reduce((n, m) => n + m.assuntos.length, 0)
    if (assuntos) parts.push(countOf(assuntos, 'assunto', 'assuntos'))
    return parts.join(' · ')
  })
}

/** "14 caminhos mais fundos e 230 etiquetas viram etiquetas"; empty without any. */
export function tagsLine(mapping: Pick<AnkiImportMapping, 'deep_paths' | 'tags'>): string {
  const deep = mapping.deep_paths ? countOf(mapping.deep_paths, 'caminho mais fundo', 'caminhos mais fundos') : ''
  const tags = mapping.tags ? countOf(mapping.tags, 'etiqueta', 'etiquetas') : ''
  if (!deep && !tags) return ''
  const total = mapping.deep_paths + mapping.tags
  const verb = total === 1 ? 'vira etiqueta' : 'viram etiquetas'
  if (!mapping.deep_paths && mapping.tags) return `${tags} do Anki ${total === 1 ? 'continua etiqueta' : 'continuam etiquetas'}`
  return `${[deep, tags].filter(Boolean).join(' e ')} ${verb}`
}
