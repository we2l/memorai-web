/**
 * The file of a conferred edital page, content/editais/<slug>.json (prd-paginas-edital-publicas §4, §6). The API's
 * `editais:public-curate --stdout` writes it with the `edital` block empty; the owner fills it by hand from the PDF.
 * No imports here: the app pulls this file into the browser bundle.
 */
export const EDITAL_AREAS = ['concurso', 'oab'] as const
export type EditalArea = typeof EDITAL_AREAS[number]

/** Ceilings of the reading (EditalProposal of the API): a proposal above them was edited by hand */
export const EDITAL_PAGE_LIMITS = { subjects: 40, topics: 400 } as const

export interface EditalPageTopic { name: string, description: string | null }
export interface EditalPageSubject { name: string, topics: EditalPageTopic[] }
export interface EditalPageProposal { name: string, exam_date: string | null, subjects: EditalPageSubject[] }

/** Hand-filled facts of the edital: each one as the edital writes it, with its page in `paginas` */
export interface EditalFacts {
  orgao: string
  orgao_sigla: string
  cargo: string
  cargos_mesma_lista: string[]
  banca: string
  banca_url: string | null
  numero: string
  publicado_em: string | null
  inscricoes_inicio: string | null
  inscricoes_fim: string | null
  taxa: string | null
  prova: string | null
  /** The edital says only "prevista": the screen says "prevista para" */
  prova_prevista?: boolean
  vagas: string | null
  remuneracao: string | null
  /** Page of the PDF of each fact: {"prova": 3, "vagas": 2} */
  paginas: Partial<Record<EditalFactKey, number>>
}
export type EditalFactKey = 'orgao' | 'cargo' | 'banca' | 'numero' | 'publicado_em' | 'inscricoes' | 'inscricoes_inicio' | 'inscricoes_fim' | 'taxa' | 'prova' | 'vagas' | 'remuneracao' | 'quadro'

export interface EditalChange { date: string, what: string }

export interface EditalPage {
  version: 1
  /** ULID of the curated public reading: the apply, the lead and the report use it */
  id: string
  slug: string
  /** Pages of the same edital (one per cargo with its own list) share it */
  group: string | null
  area: EditalArea
  checked_at: string
  exported_at?: string
  source_url: string
  proposal_sha256: string
  proposal: EditalPageProposal
  weights: { subject: string, points: number, source: 'edital' }[] | null
  counts: { subjects: number, topics: number }
  source?: { pages: { from: number | null, to: number | null } | null, found: string | null, truncated: boolean, label: string | null } | null
  edital: EditalFacts
  expires_on: string | null
  status_override: 'suspenso' | 'cancelado' | null
  status_date: string | null
  /** The page of the next edital of the same organ ("Saiu o edital {ano}") */
  next_slug: string | null
  siblings: string[]
  related_blog: string[]
  changes: EditalChange[]
}

/** What the index, the links and the footer need (no list): `#editais/index` */
export interface EditalPageMeta {
  id: string
  slug: string
  group: string | null
  area: EditalArea
  year: string
  orgao: string
  orgao_sigla: string
  cargo: string
  banca: string
  prova: string | null
  prova_prevista: boolean
  inscricoes_inicio: string | null
  inscricoes_fim: string | null
  expires_on: string | null
  status_override: 'suspenso' | 'cancelado' | null
  status_date: string | null
  checked_at: string
  /** The newest of checked_at and changes[].date (the sitemap's lastmod) */
  lastmod: string
  topics: number
  subjects: number
}
