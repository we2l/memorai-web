/**
 * "Colar questão errada" (prd-questao-errada RF-F1): separates a pasted question into statement, alternatives,
 * answer key, comment and source, without AI. Deterministic and pure: what it does not recognize stays in the
 * statement, and every field is editable on the sheet. It reads only the text the user pasted (RN-5).
 *
 * Formats: alternatives A) a) (A) A. A - on their own line, or the letter alone on a line (Qconcursos) or
 * "A texto" in a full A–D run (ENEM); Cebraspe's Certo/Errado; "Gabarito: C", "Resposta: letra B", "Gab.: E";
 * "Comentário:"/"Resolução:"; the banca header ("Ano: 2023 Banca: FGV Órgão: TJ-RJ", "(FCC - 2019 - TRF)");
 * several questions numbered ("1.", "Questão 2", "Q123456") or separated by "---", up to MAX_QUESTIONS.
 */

export type QuestionKind = 'multiple_choice' | 'true_false' | 'open'

export interface Alternative {
  letter: string
  text: string
}

export type ParseWarning = 'no_answer' | 'no_alternatives' | 'answer_not_in_alternatives'

export interface ParsedQuestion {
  kind: QuestionKind
  stem: string
  alternatives: Alternative[]
  /** multiple_choice: the letter; true_false: 'certo' | 'errado'; open: the expected answer; '' when not found */
  answer: string
  explanation: string
  source: string
  /** The block as pasted (sent as raw_text) */
  raw: string
  warnings: ParseWarning[]
}

export interface ParseResult {
  questions: ParsedQuestion[]
  /** More blocks than MAX_QUESTIONS: only the first ones were kept */
  truncated: boolean
}

export const MAX_QUESTIONS = 20
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']
const BANCAS = 'CESPE|CEBRASPE|FGV|FCC|VUNESP|FUNDATEC|IBFC|IADES|AOCP|QUADRIX|CESGRANRIO|FUMARC|CONSULPLAN|IDECAN|INEP|ENEM|OAB|ESAF|FEPESE|COMPERVE|SELECON|IBADE|FAURGS|FUNRIO|CETRO|NC-UFPR|UFPR|FUVEST|UNICAMP|COPESE|COPEVE|FADESP|IDIB|OBJETIVA|LEGALLE|AVANÇASP|FUNCAB|MPE|CEPERJ|INSTITUTO'

// Lines the question sites put around the question when copied ("Responder", "Você errou!", "Comentários (12)")
const NOISE = /^(?:responder|resolver|voc[eê] errou!?|voc[eê] acertou!?|parab[eé]ns!?\s*voc[eê] acertou!?|coment[aá]rios?\s*\(\d+\)|estat[ií]sticas|aulas?|gabarito comentado|quest[aã]o anulada|desatualizada|anota[cç][oõ]es|cadernos?|notificar erro|marcar|ver (?:coment[aá]rios|resolu[cç][aã]o)|filtrar|compartilhar|f[oó]rum|\d+\s*coment[aá]rios?)$/i
const NOISE_PREFIX = /^(?:voc[eê] errou!?|voc[eê] acertou!?|parab[eé]ns!?(?:\s*voc[eê] acertou!?)?|errou!?|acertou!?)\s*/i
const HEADER_FIELD = /^(ano|banca|[oó]rg[aã]o|prova|disciplina|assunto|n[ií]vel|modalidade|cargo)\s*:/i
const QID = /^Q\d{4,}$/i
const QUESTION_HEADER = /^quest[aã]o\s*(?:n[ºo°.]\s*)?\d{1,3}\s*[.:)\-–]?\s*/i
const SEPARATOR = /^(?:-{3,}|_{3,}|={3,}|\*{3,})$/
const NUMBERED = /^(\d{1,3})\s*[.)\-–]\s+(?=\S)/
const COMMENT = /^(?:coment[aá]rios?(?:\s+do\s+professor)?|resolu[cç][aã]o|explica[cç][aã]o|justificativa|fundamenta[cç][aã]o)\s*[:\-–]\s*/i
const COMMENT_ALONE = /^(?:coment[aá]rios?(?:\s+do\s+professor)?|resolu[cç][aã]o|explica[cç][aã]o|justificativa)\s*:?$/i
const ANSWER = /^(?:gabarito(?:\s+oficial|\s+preliminar|\s+definitivo)?|gab\.?|resposta(?:\s+correta|\s+certa)?|alternativa\s+correta|letra\s+correta|padr[aã]o\s+de\s+resposta)\s*[:\-–.]?\s*(.*)$/i
const STRICT_ALT = /^(?:\(([A-Fa-f])\)|([A-Fa-f])\s*\)|([A-F])\s*\.|([A-Fa-f])\s+[-–—])\s*(.*)$/
const LETTER_ALONE = /^([A-F])$/
const LOOSE_ALT = /^([A-F])\s+(\S.*)$/
const TF_INLINE = /^\(\s*\)\s*certo\s*\(\s*\)\s*errado$/i
const TF_WORD = /^(certo|errado|c|e|verdadeiro|falso|v|f)$/i

export function parseQuestions(text: string): ParseResult {
  const lines = normalize(text).split('\n')
  const { blocks, key } = splitBlocks(lines)
  const truncated = blocks.length > MAX_QUESTIONS
  const questions = blocks.slice(0, MAX_QUESTIONS).map(b => parseBlock(b.lines, b.number))
  // An answer key at the end of a list ("Gabarito: 1-C, 2-B"), when the questions did not bring their own
  if (key.size) {
    questions.forEach((q, i) => {
      const value = key.get(blocks[i]!.number ?? i + 1)
      if (!q.answer && value) applyAnswer(q, value)
    })
  }
  return { questions: questions.filter(q => q.stem || q.alternatives.length), truncated }
}

/** One question (the sheet re-parses a single block when the text has no separators). */
export function parseQuestion(text: string): ParsedQuestion {
  return parseBlock(normalize(text).split('\n'), null)
}

function normalize(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/[   \t]/g, ' ')
    .replace(/[​-‍﻿]/g, '')
    .split('\n').map(l => l.replace(/ {2,}/g, ' ').trim()).join('\n')
    .trim()
}

interface Block { lines: string[]; number: number | null }

function isHeaderLine(line: string): boolean {
  return QID.test(line) || /^ano\s*:\s*\d{4}/i.test(line) || (QUESTION_HEADER.test(line) && line.replace(QUESTION_HEADER, '').length < 120)
}

function splitBlocks(lines: string[]): { blocks: Block[]; key: Map<number, string> } {
  const key = new Map<number, string>()
  const body = extractAnswerKey(lines, key)

  // 1) explicit separators
  if (body.some(l => SEPARATOR.test(l))) {
    const blocks: Block[] = []
    let cur: string[] = []
    for (const l of body) {
      if (SEPARATOR.test(l)) { if (cur.some(Boolean)) blocks.push({ lines: cur, number: null }); cur = [] } else cur.push(l)
    }
    if (cur.some(Boolean)) blocks.push({ lines: cur, number: null })
    if (blocks.length > 1) return { blocks: blocks.map((b, i) => ({ ...b, number: i + 1 })), key }
  }

  // 2) headers of the question sites (Q123456, "Ano: 2023 Banca:", "Questão 3"); a header right after another one is the same question
  const starts: number[] = []
  let lastHeader = -2
  body.forEach((l, i) => {
    if (!isHeaderLine(l)) { if (l) lastHeader = -2; return }
    if (lastHeader !== i - 1 || !starts.length) { if (lastHeader !== i - 1) starts.push(i) }
    lastHeader = i
  })
  if (starts.length > 1) {
    const blocks = starts.map((s, i) => ({ lines: body.slice(i === 0 ? 0 : s, starts[i + 1] ?? body.length), number: headerNumber(body[s]!) ?? i + 1 }))
    return { blocks, key }
  }

  // 3) "1." "2)" at the start of lines, consecutive, each block with its own alternatives or answer key
  const numbered: { index: number; n: number }[] = []
  body.forEach((l, i) => {
    const m = NUMBERED.exec(l)
    if (!m) return
    const n = Number(m[1])
    const expected = numbered.length ? numbered[numbered.length - 1]!.n + 1 : null
    if (expected === null || n === expected) numbered.push({ index: i, n })
  })
  if (numbered.length > 1) {
    const blocks = numbered.map((s, i) => {
      const slice = body.slice(i === 0 ? 0 : s.index, numbered[i + 1]?.index ?? body.length)
      const at = slice.indexOf(body[s.index]!)
      if (at >= 0) slice[at] = slice[at]!.replace(NUMBERED, '')
      return { lines: slice, number: s.n }
    })
    if (blocks.every(b => looksLikeQuestion(b.lines))) return { blocks, key }
  }

  return { blocks: [{ lines: body, number: null }], key }
}

function headerNumber(line: string): number | null {
  const m = /^quest[aã]o\s*(?:n[ºo°.]\s*)?(\d{1,3})/i.exec(line)
  return m ? Number(m[1]) : null
}

function looksLikeQuestion(lines: string[]): boolean {
  return lines.some(l => ANSWER.test(l) || TF_INLINE.test(l)) || findAlternatives(lines) !== null
}

/** "Gabarito: 1-C, 2-B, 3-E" (or a "Gabarito" line followed by "1 C" lines) at the end of a list. */
function extractAnswerKey(lines: string[], key: Map<number, string>): string[] {
  const pair = /(\d{1,3})\s*[-–.:)=]?\s*(certo|errado|[A-Fa-f])\b/gi
  for (let i = lines.length - 1; i >= 0; i--) {
    const m = /^gabaritos?\s*:?\s*(.*)$/i.exec(lines[i]!)
    if (!m) continue
    const tail = [m[1]!, ...lines.slice(i + 1)].join(' ')
    const pairs = [...tail.matchAll(pair)]
    if (pairs.length < 2) return lines
    for (const p of pairs) key.set(Number(p[1]), p[2]!)
    return lines.slice(0, i)
  }
  return lines
}

function parseBlock(input: string[], _number: number | null): ParsedQuestion {
  const raw = input.join('\n').trim()
  let lines = input
    .map(l => l.replace(NOISE_PREFIX, ''))
    .filter(l => !NOISE.test(l))

  // Source: the banca header at the top
  const sourceParts: Record<string, string> = {}
  let source = ''
  while (lines.length && (!lines[0] || HEADER_FIELD.test(lines[0]) || QID.test(lines[0]) || QUESTION_HEADER.test(lines[0]))) {
    const line = lines.shift()!
    if (QUESTION_HEADER.test(line)) {
      const rest = line.replace(QUESTION_HEADER, '').trim()
      if (rest) { lines.unshift(rest); break }
      continue
    }
    for (const m of line.matchAll(/(ano|banca|[oó]rg[aã]o|prova)\s*:\s*(.+?)(?=\s+(?:ano|banca|[oó]rg[aã]o|prova|disciplina|assunto)\s*:|$)/gi)) {
      sourceParts[m[1]!.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')] = m[2]!.trim()
    }
  }
  if (Object.keys(sourceParts).length) {
    source = [sourceParts.banca, sourceParts.ano, sourceParts.orgao].filter(Boolean).join(' · ') || sourceParts.prova || ''
  }
  if (lines.length) {
    const first = lines[0]!
    const paren = new RegExp(`^\\(((?:${BANCAS})\\b[^)]{0,160})\\)\\s*[-–.:]?\\s*`, 'i').exec(first)
    const tec = new RegExp(`^((?:${BANCAS})\\b\\s*[-–/].{3,160})$`, 'i').exec(first)
    if (paren) {
      source ||= paren[1]!.trim()
      lines[0] = first.slice(paren[0].length)
      if (!lines[0]) lines.shift()
    } else if (tec && !STRICT_ALT.test(first)) {
      source ||= tec[1]!.trim()
      lines.shift()
    }
  }

  // Comment: from "Comentário:" to the end
  let explanation: string[] = []
  const ci = lines.findIndex(l => COMMENT.test(l) || COMMENT_ALONE.test(l))
  if (ci >= 0) {
    explanation = [lines[ci]!.replace(COMMENT, '').replace(COMMENT_ALONE, ''), ...lines.slice(ci + 1)]
    lines = lines.slice(0, ci)
  }

  // Answer key: in the question or in the comment (last one wins)
  let answerValue = ''
  const takeAnswer = (arr: string[]): string[] => {
    for (let i = arr.length - 1; i >= 0; i--) {
      const m = ANSWER.exec(arr[i]!)
      if (!m) continue
      let value = m[1]!.trim()
      let drop = 1
      if (!value && arr[i + 1]) { value = arr[i + 1]!; drop = 2 }
      answerValue = value
      return [...arr.slice(0, i), ...arr.slice(i + drop)]
    }
    return arr
  }
  lines = takeAnswer(lines)
  if (!answerValue) explanation = takeAnswer(explanation)

  // Certo/Errado markers of Cebraspe
  let tf = false
  lines = lines.filter((l) => {
    if (TF_INLINE.test(l)) { tf = true; return false }
    return true
  })
  const tail = lines.filter(Boolean).slice(-2).map(l => l.toLowerCase().replace(/[()\s]/g, ''))
  if (tail.length === 2 && tail[0] === 'certo' && tail[1] === 'errado') {
    tf = true
    let dropped = 0
    for (let i = lines.length - 1; i >= 0 && dropped < 2; i--) {
      if (lines[i]) { lines.splice(i, 1); dropped++ } else lines.splice(i, 1)
    }
  }

  let alternatives: Alternative[] = []
  const found = tf ? null : findAlternatives(lines)
  if (found) {
    alternatives = found.alternatives
    lines = lines.slice(0, found.start)
  }

  const stem = joinText(lines)
  const q: ParsedQuestion = {
    kind: 'open',
    stem,
    alternatives,
    answer: '',
    explanation: joinText(explanation),
    source: source.slice(0, 120),
    raw,
    warnings: [],
  }

  const isCertoErrado = alternatives.length === 2 && alternatives.every(a => /^(certo|errado)$/i.test(a.text))
  const value = cleanAnswer(answerValue)
  if (tf || isCertoErrado) q.kind = 'true_false'
  else if (alternatives.length >= 2) q.kind = 'multiple_choice'
  else if (/^(certo|errado)$/i.test(value)) q.kind = 'true_false'
  else if (/^[CE]$/i.test(value) && /\bjulgu?e\b|\bitem\b/i.test(stem)) q.kind = 'true_false'
  else if (/^[A-F]$/i.test(value)) q.kind = 'multiple_choice'
  else if (!value && /\bjulgu?e\b|certo ou errado/i.test(stem)) q.kind = 'true_false'
  if (q.kind === 'true_false') q.alternatives = []

  if (answerValue) applyAnswer(q, answerValue)
  else q.warnings.push('no_answer')
  if (q.kind === 'multiple_choice' && q.alternatives.length < 2) q.warnings.push('no_alternatives')
  return q
}

function cleanAnswer(value: string): string {
  return value.trim()
    .replace(/^(?:letra|alternativa|item)\s+/i, '')
    .replace(/^\(([A-Fa-f])\)/, '$1')
    .replace(/^([A-Fa-f])\s*[).]\s*$/, '$1')
    .replace(/[.!;]+$/, '')
    .trim()
}

/** The answer key in the shape of the kind (letter, certo/errado, text). */
function applyAnswer(q: ParsedQuestion, value: string) {
  const v = cleanAnswer(value)
  q.warnings = q.warnings.filter(w => w !== 'no_answer' && w !== 'answer_not_in_alternatives')
  if (q.kind === 'true_false') {
    const w = v.toLowerCase()
    if (TF_WORD.test(w)) q.answer = ['certo', 'c', 'verdadeiro', 'v'].includes(w) ? 'certo' : 'errado'
    else q.warnings.push('no_answer')
    return
  }
  if (q.kind === 'multiple_choice') {
    const m = /^([A-Fa-f])(?:\b|$)/.exec(v)
    const letter = m ? m[1]!.toUpperCase() : ''
    if (letter && (q.alternatives.length < 2 || q.alternatives.some(a => a.letter === letter))) q.answer = letter
    else q.warnings.push(letter ? 'answer_not_in_alternatives' : 'no_answer')
    return
  }
  q.answer = v
}

/**
 * The alternatives: the last run of lines A, B, C… in order. Strict markers (A) "(A)" "A." "A -") need 2+;
 * the letter alone on a line (Qconcursos) needs 2+; "A texto" without punctuation (ENEM) needs A–D, since
 * "A" is also an article that starts sentences.
 */
function findAlternatives(lines: string[]): { start: number; alternatives: Alternative[] } | null {
  for (const mode of ['strict', 'alone', 'loose'] as const) {
    let best: { start: number; alternatives: Alternative[] } | null = null
    for (let i = 0; i < lines.length; i++) {
      const first = marker(lines[i]!, mode)
      if (!first || first.letter !== 'A') continue
      const run = collectRun(lines, i, mode)
      const min = mode === 'loose' ? 4 : 2
      if (run.length >= min) best = { start: i, alternatives: run }
    }
    if (best) return best
  }
  return null
}

function marker(line: string, mode: 'strict' | 'alone' | 'loose'): { letter: string; text: string } | null {
  if (mode === 'strict') {
    const m = STRICT_ALT.exec(line)
    return m ? { letter: (m[1] ?? m[2] ?? m[3] ?? m[4])!.toUpperCase(), text: m[5]!.trim() } : null
  }
  if (mode === 'alone') {
    const m = LETTER_ALONE.exec(line)
    return m ? { letter: m[1]!, text: '' } : null
  }
  const m = LOOSE_ALT.exec(line)
  return m ? { letter: m[1]!, text: m[2]!.trim() } : null
}

function collectRun(lines: string[], start: number, mode: 'strict' | 'alone' | 'loose'): Alternative[] {
  const run: Alternative[] = []
  let current: Alternative | null = null
  for (let i = start; i < lines.length; i++) {
    const line = lines[i]!
    const m = marker(line, mode)
    const expected = LETTERS[run.length]
    if (m && m.letter === expected) {
      current = { letter: m.letter, text: m.text }
      run.push(current)
      continue
    }
    if (!current) break
    if (!line) continue
    current.text = current.text ? `${current.text} ${line}` : line
  }
  return run.filter(a => a.text.trim()).length === run.length ? run : run.filter(a => a.text.trim())
}

function joinText(lines: string[]): string {
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

/** "2. Certo ou errado · Gabarito: Errado" for the collapsed row of a question (short: the phone truncates it). */
export function questionSummary(q: ParsedQuestion, index: number): string {
  const kind = { multiple_choice: 'Múltipla escolha', true_false: 'Certo ou errado', open: 'Discursiva' }[q.kind]
  const answer = q.answer ? (q.kind === 'true_false' ? (q.answer === 'certo' ? 'Certo' : 'Errado') : q.kind === 'open' ? 'com resposta' : q.answer) : 'sem gabarito'
  return `${index + 1}. ${kind} · ${q.answer ? `Gabarito: ${answer}` : answer}`
}
