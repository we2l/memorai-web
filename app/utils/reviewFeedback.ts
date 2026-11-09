/**
 * The words of the feedback band of the review (prd-visual-e2 RF-2.4, ADR-035 §6): a short fixed list, 4 variations
 * per kind, the variation chosen by the card (stable: the same card always gets the same phrase, no flicker on a
 * re-render). Never red, never blame. Pure.
 */
import { returnText } from '~/utils/intervalLabel'

/** ok/again: the self rating; tf-*: Certo/Errado; typed-*: the typed answer (prd-revisao-v5-fase-b) */
export type FeedbackKind = 'ok' | 'again' | 'tf-ok' | 'tf-again' | 'typed-ok' | 'typed-again'

const TITLES: Record<FeedbackKind, readonly string[]> = {
  'ok': ['Na mosca!', 'Isso aí!', 'Lembrou bem.', 'Mandou bem.'],
  'again': ['Tranquilo, faz parte.', 'Sem problema.', 'Errar aqui é treino.', 'Faz parte do caminho.'],
  'tf-ok': ['Isso, certo!', 'Na mosca!', 'Leitura certeira.', 'Mandou bem.'],
  'tf-again': ['Pegadinha clássica.', 'Essa pega muita gente.', 'Quase: releia o detalhe.', 'Tranquilo, faz parte.'],
  'typed-ok': ['Escreveu certo!', 'Na mosca!', 'Isso aí!', 'Lembrou bem.'],
  'typed-again': ['Quase lá.', 'Tranquilo, faz parte.', 'Errar aqui é treino.', 'Faltou um detalhe.'],
}

/** Small non-cryptographic hash: the same id picks the same variation. */
function pick(id: string, n: number): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return h % n
}

export function isOkKind(kind: FeedbackKind): boolean {
  return kind === 'ok' || kind === 'tf-ok' || kind === 'typed-ok'
}

/** "Na mosca!" for this card and kind. */
export function feedbackTitle(kind: FeedbackKind, cardId: string): string {
  const list = TITLES[kind]
  return list[pick(`${kind}:${cardId}`, list.length)]!
}

/**
 * Where the card goes, as a sentence: "Volta em 16 dias.", "Volta amanhã.", "Ele volta daqui a 10 minutos."
 * The interval is the API label ("16d", "10min"); empty when the API sent none.
 */
export function feedbackWhen(kind: FeedbackKind, interval: string): string {
  if (!interval) return ''
  const when = returnText(interval)
  if (!isOkKind(kind)) {
    const min = /^em (\d+(?:,\d+)?) min$/.exec(when)
    if (min) return `Ele volta daqui a ${min[1]} ${min[1] === '1' ? 'minuto' : 'minutos'}.`
    return `Ele volta ${when}.`
  }
  return `Volta ${when}.`
}
