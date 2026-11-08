/**
 * The typed answer of the review (prd-revisao-v5-fase-b RF-F6, B-D7): a tolerant comparison that ignores accents,
 * case, punctuation, symbols and extra spaces, and nothing else (no synonyms, no plural, no typos: the person has the
 * last word with "Contar como certo"). The diff is by word, so the screen can show what was missing or extra. Pure.
 */

/** "Ação  Civil, Pública!" → "acao civil publica" */
export function normalizeAnswer(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[\p{P}\p{S}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function answersMatch(typed: string, expected: string): boolean {
  const a = normalizeAnswer(typed)
  return a !== '' && a === normalizeAnswer(expected)
}

export type DiffPart = { kind: 'same' | 'missing' | 'extra'; text: string }

/**
 * Word diff of the typed answer against the expected one (longest common subsequence over the normalized words, the
 * words shown as written). `missing` = in the answer, not typed; `extra` = typed, not in the answer.
 */
export function answerDiff(typed: string, expected: string): DiffPart[] {
  const tw = words(typed)
  const ew = words(expected)
  const n = tw.length
  const m = ew.length
  const lcs: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i]![j] = tw[i]!.key === ew[j]!.key ? lcs[i + 1]![j + 1]! + 1 : Math.max(lcs[i + 1]![j]!, lcs[i]![j + 1]!)
    }
  }
  const parts: DiffPart[] = []
  const push = (kind: DiffPart['kind'], text: string) => {
    const last = parts[parts.length - 1]
    if (last?.kind === kind) last.text += ` ${text}`
    else parts.push({ kind, text })
  }
  let i = 0
  let j = 0
  while (i < n || j < m) {
    if (i < n && j < m && tw[i]!.key === ew[j]!.key) {
      push('same', ew[j]!.raw)
      i++
      j++
    } else if (j < m && (i >= n || lcs[i]![j + 1]! >= lcs[i + 1]![j]!)) {
      push('missing', ew[j]!.raw)
      j++
    } else {
      push('extra', tw[i]!.raw)
      i++
    }
  }
  return parts
}

function words(text: string): { raw: string; key: string }[] {
  return text
    .split(/\s+/)
    .map(raw => ({ raw, key: normalizeAnswer(raw) }))
    .filter(w => w.key !== '')
}
