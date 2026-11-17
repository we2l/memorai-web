/**
 * Build-time check of content/editais/*.json (prd-paginas-edital-publicas RF-W1, R5.1, R5.8): a page goes out only with
 * the whole list, the official PDF, the date of the check, the organ, the banca, the cargo and a day it stops serving.
 * Every refusal names the file and the field, in PT-BR, and fails the build (a data error never reaches production).
 */
import { createHash } from 'node:crypto'
import { EDITAL_AREAS, EDITAL_PAGE_LIMITS, type EditalPage, type EditalPageProposal } from './types'
import { editalYear } from './year'

export { editalYear }

const DATE = /^\d{4}-\d{2}-\d{2}$/
/** {orgao-sigla}-{ano do edital}-{cargo-curto} (R5.6): the year is what the H1 shows */
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const ULID = /^[0-9A-HJKMNP-TV-Z]{26}$/i

/**
 * sha256 of the canonical JSON of the proposal: keys sorted at every level, lists in order, no spaces. Same bytes as
 * PublicEditalService::proposalSha256 of the API (json_encode with unescaped unicode, slashes and line terminators).
 */
export function proposalSha256(proposal: unknown): string {
  const sort = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(sort)
    if (v && typeof v === 'object') {
      return Object.fromEntries(Object.keys(v).sort().map(k => [k, sort((v as Record<string, unknown>)[k])]))
    }
    return v
  }
  return createHash('sha256').update(JSON.stringify(sort(proposal)), 'utf8').digest('hex')
}

function validDate(v: unknown): v is string {
  if (typeof v !== 'string' || !DATE.test(v)) return false
  const d = new Date(`${v}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v
}

const text = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0
const https = (v: unknown): v is string => typeof v === 'string' && /^https:\/\/[^\s/]+\.[^\s]+$/.test(v)

export interface EditalCheckContext {
  /** Day of the build (São Paulo) */
  today: string
}

/** One file, alone: shape, dates, list and the facts with their page. Links across files: `checkEditalLinks`. */
export function validateEditalPage(raw: unknown, file: string, slugFromFile: string, ctx: EditalCheckContext): EditalPage {
  const fail = (msg: string): never => { throw new Error(`${file}: ${msg}`) }
  if (!raw || typeof raw !== 'object') fail('o arquivo não é um objeto JSON')
  const p = raw as EditalPage
  if (p.version !== 1) fail('version tem de ser 1')
  if (p.slug !== slugFromFile) fail(`o nome do arquivo (${slugFromFile}) é diferente do slug (${String(p.slug)})`)
  if (!SLUG.test(p.slug) || !editalYear(p.slug)) fail(`slug "${p.slug}" fora do padrão {orgao}-{ano}-{cargo} (minúsculas, sem acento)`)
  if (!text(p.id) || !ULID.test(p.id)) fail('id tem de ser o ULID da leitura pública')
  if (!EDITAL_AREAS.includes(p.area)) fail(`area tem de ser ${EDITAL_AREAS.join(' ou ')}`)
  if (!https(p.source_url)) fail('source_url tem de ser https')
  if (!validDate(p.checked_at)) fail('checked_at não é uma data AAAA-MM-DD')
  if (p.checked_at > ctx.today) fail(`checked_at (${p.checked_at}) está no futuro`)

  // The list: whole, inside the ceilings of the reading, and the same the API applies (sha)
  const proposal = p.proposal as EditalPageProposal | undefined
  if (!proposal || !text(proposal.name) || !Array.isArray(proposal.subjects) || !proposal.subjects.length) fail('falta proposal com name e subjects')
  let topics = 0
  for (const [i, s] of proposal!.subjects.entries()) {
    if (!text(s?.name)) fail(`proposal.subjects[${i}] sem name`)
    if (!Array.isArray(s.topics) || !s.topics.length) fail(`a matéria "${s.name}" está vazia`)
    for (const t of s.topics) if (!text(t?.name)) fail(`a matéria "${s.name}" tem assunto sem name`)
    topics += s.topics.length
  }
  if (proposal!.subjects.length > EDITAL_PAGE_LIMITS.subjects) fail(`mais de ${EDITAL_PAGE_LIMITS.subjects} matérias`)
  if (topics > EDITAL_PAGE_LIMITS.topics) fail(`mais de ${EDITAL_PAGE_LIMITS.topics} assuntos`)
  if (p.counts?.subjects !== proposal!.subjects.length || p.counts?.topics !== topics) fail(`counts não bate com a lista (${proposal!.subjects.length} matérias, ${topics} assuntos)`)
  if (!text(p.proposal_sha256)) fail('falta proposal_sha256')
  if (proposalSha256(proposal) !== p.proposal_sha256) {
    fail('proposal_sha256 não bate com a lista: corrija a lista pelo editais:public-curate --proposal e exporte de novo (o apply usa a do banco)')
  }
  if (p.weights != null) {
    if (!Array.isArray(p.weights)) fail('weights tem de ser uma lista ou null')
    const names = new Set(proposal!.subjects.map(s => s.name))
    for (const w of p.weights!) {
      if (!names.has(w?.subject)) fail(`weights cita a matéria "${String(w?.subject)}", que não está na lista`)
      if (typeof w.points !== 'number' || !(w.points > 0)) fail(`weights de "${w.subject}" sem points`)
    }
  }

  // The facts: required ones, ISO dates, and each one with its page of the edital (R5.8)
  const e = p.edital
  if (!e || typeof e !== 'object') fail('falta o bloco edital')
  for (const key of ['orgao', 'orgao_sigla', 'cargo', 'banca', 'numero'] as const) {
    if (!text(e[key])) fail(`edital.${key} é obrigatório (preencha à mão, como o edital escreve)`)
  }
  for (const key of ['publicado_em', 'inscricoes_inicio', 'inscricoes_fim', 'prova'] as const) {
    if (e[key] != null && !validDate(e[key])) fail(`edital.${key} não é uma data AAAA-MM-DD`)
  }
  for (const key of ['expires_on', 'status_date'] as const) {
    if (p[key] != null && !validDate(p[key])) fail(`${key} não é uma data AAAA-MM-DD`)
  }
  if (!e.prova && !p.expires_on) fail('falta edital.prova e falta expires_on: toda página precisa de um dia de vencimento')
  if (e.inscricoes_inicio && e.inscricoes_fim && e.inscricoes_inicio > e.inscricoes_fim) fail('inscricoes_inicio cai depois de inscricoes_fim')
  if (e.inscricoes_inicio && !e.inscricoes_fim) fail('inscricoes_inicio sem inscricoes_fim')
  if (e.inscricoes_fim && e.prova && e.inscricoes_fim > e.prova) fail('inscricoes_fim cai depois da prova')
  if (e.banca_url != null && !https(e.banca_url)) fail('edital.banca_url tem de ser https')
  if (!Array.isArray(e.cargos_mesma_lista)) fail('edital.cargos_mesma_lista tem de ser uma lista')
  const pages = e.paginas ?? {}
  if (typeof pages !== 'object' || Array.isArray(pages)) fail('edital.paginas tem de ser um objeto')
  for (const [key, n] of Object.entries(pages)) if (!Number.isInteger(n) || (n as number) < 1) fail(`edital.paginas.${key} tem de ser o número da página`)
  const needsPage: [string, unknown][] = [['prova', e.prova], ['inscricoes', e.inscricoes_fim], ['taxa', e.taxa], ['vagas', e.vagas], ['remuneracao', e.remuneracao]]
  for (const [key, value] of needsPage) {
    if (value != null && value !== '' && !(pages as Record<string, number>)[key]) fail(`edital.${key === 'inscricoes' ? 'inscricoes_fim' : key} sem a página do edital em edital.paginas.${key}`)
  }
  for (const key of ['taxa', 'vagas', 'remuneracao'] as const) {
    if (e[key] != null && !text(e[key])) fail(`edital.${key} é texto como o edital escreve, ou null`)
  }

  if (p.status_override != null && !['suspenso', 'cancelado'].includes(p.status_override)) fail('status_override tem de ser suspenso, cancelado ou null')
  if (p.status_override === 'suspenso' && !p.status_date) fail('status_override suspenso pede status_date')
  for (const key of ['siblings', 'related_blog', 'changes'] as const) if (!Array.isArray(p[key])) fail(`${key} tem de ser uma lista`)
  if (p.related_blog.length > 3) fail('related_blog: de 1 a 3 artigos')
  for (const c of p.changes) {
    if (!validDate(c?.date) || !text(c?.what)) fail('changes[] pede {date AAAA-MM-DD, what}')
    if (c.date > ctx.today) fail(`changes[] com data no futuro (${c.date})`)
  }
  return p
}

/** Links across the files: siblings, next_slug, related_blog, and one page per group + cargo */
export function checkEditalLinks(pages: EditalPage[], blogSlugs: ReadonlySet<string>): void {
  const slugs = new Set(pages.map(p => p.slug))
  const seen = new Map<string, string>()
  for (const p of pages) {
    const file = `content/editais/${p.slug}.json`
    for (const s of p.siblings) if (!slugs.has(s) || s === p.slug) throw new Error(`${file}: siblings aponta para "${s}", que não existe`)
    if (p.next_slug && !slugs.has(p.next_slug)) throw new Error(`${file}: next_slug aponta para "${p.next_slug}", que não existe`)
    for (const b of p.related_blog) if (!blogSlugs.has(b)) throw new Error(`${file}: related_blog aponta para "${b}", que não existe em content/blog`)
    if (p.group) {
      const key = `${p.group}|${p.edital.cargo.trim().toLowerCase()}`
      const other = seen.get(key)
      if (other) throw new Error(`${file}: o grupo "${p.group}" já tem uma página do cargo "${p.edital.cargo}" (${other})`)
      seen.set(key, p.slug)
    }
  }
}
