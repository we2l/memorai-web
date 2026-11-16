import type { CatalogTrial, PlanCatalog } from '~/types'

/**
 * Copy and data of the entry of /comecar (prd-entrada-comecar; the prototype approved by the owner on 16/11): the
 * visitor learns what the Baigi does in one card and a 7-step tour before any account. Every sentence is something the
 * product does today; prices, quotas and the name of the paid plan only come from GET /api/plans (RN-4). Imported only
 * by pages/comecar and components/entrada: a once-* chunk, out of the precache (nuxt.config ONE_SHOT_SHARED).
 */

export const ENTRY_STEPS = ['card', 'material', 'revisar', 'simulado', 'podcast', 'prova', 'planos'] as const
export type EntryStep = typeof ENTRY_STEPS[number]

/** `?passo=1..7` of the URL as the index of the step (0..6), or null for the entry itself. */
export function entryStepOf(raw: unknown): number | null {
  const value = Array.isArray(raw) ? raw[0] : raw
  if (typeof value !== 'string' || !/^[1-7]$/.test(value)) return null
  return Number(value) - 1
}

export type EntryIcon = 'card' | 'file' | 'bolt' | 'quiz' | 'listen' | 'flag'
/** The color of the icon on its white tile of the violet band (entrada.css .ec-ico-*) */
export type EntryTone = 'action' | 'accuracy' | 'streak' | 'quiz' | 'listen' | 'goal'

/** The 6 things the Baigi does (the violet band): each opens its step of the tour. */
export const ENTRY_FEATURES: { title: string, text: string, icon: EntryIcon, tone: EntryTone, step: number }[] = [
  { title: 'Revisar no dia certo', text: 'Cada card volta antes de você esquecer.', icon: 'card', tone: 'action', step: 0 },
  { title: 'Seu PDF vira cards', text: 'A IA lê o seu material e monta os cards.', icon: 'file', tone: 'accuracy', step: 1 },
  { title: 'Relâmpago', text: 'Só 5 minutos? Revise os cards que já venceram.', icon: 'bolt', tone: 'streak', step: 2 },
  { title: 'Simulados', text: 'Questões do seu material, como na prova.', icon: 'quiz', tone: 'quiz', step: 3 },
  { title: 'Podcast', text: 'Episódios curtos com o que você mais erra.', icon: 'listen', tone: 'listen', step: 4 },
  { title: 'Edital e cronograma', text: 'Do edital ao plano de cada dia até a prova.', icon: 'flag', tone: 'goal', step: 5 },
]

/**
 * The card of step 1, checked against Lei 8.213/91 (RN-3): art. 25, I sets 12 monthly contributions of carência for
 * the auxílio por incapacidade temporária.
 */
export const ENTRY_CARD = {
  source: 'INSS · Lei 8.213/91',
  front: 'Quantas contribuições mensais são exigidas de carência para o auxílio por incapacidade temporária?',
  back: '12 contribuições mensais',
  cite: 'Lei 8.213/91, art. 25, I',
} as const

/**
 * When the card comes back, in days (RN-2): the API's intervals for a new card of the sample deck, which has no
 * learning steps (GuestDeckService → ReviewService::newCardIntervals; GET /onboarding/areas/{area} answered
 * good = 2d and again = 1d on 16/11). A constant on purpose: the page is prerendered, the card never waits for the
 * network and nothing is saved. If the sample deck's FSRS changes, change these two numbers.
 */
export const ENTRY_CARD_INTERVALS = { remembered: 2, forgot: 1 } as const

/** "amanhã" | "daqui a 2 dias" */
export function returnIn(days: number): string {
  return days === 1 ? 'amanhã' : `daqui a ${days} dias`
}

export type EntryRating = 'remembered' | 'forgot'

/** The feedback band of step 1, with the real interval. */
export function cardFeedback(rating: EntryRating): { title: string, text: string } {
  return rating === 'remembered'
    ? { title: 'Lembrou!', text: `Então este card só volta ${returnIn(ENTRY_CARD_INTERVALS.remembered)}.` }
    : { title: 'Faz parte.', text: `Este card volta ${returnIn(ENTRY_CARD_INTERVALS.forgot)}, antes de sumir da memória.` }
}

/**
 * The real podcast sample (RN-5): a copy of utils/podcastSample.ts, like utils/landing.ts SAMPLE (importing it would
 * add a shared chunk to the precache); tests/utils/podcastSample.test.ts keeps the three equal. `bars` = the landing's
 * 120 peaks reduced to 40 (the loudest of each 3).
 */
export const ENTRY_SAMPLE = {
  src: '/landing/podcast-amostra.mp3',
  duration: 19.8,
  title: 'Seus erros de Seguridade Social',
  topic: 'Concurso INSS',
  lines: [
    { t: 0.1, text: 'Essa aqui te pegou duas vezes no último mês.', kind: 'question' },
    { t: 2.6, text: 'Qual é a carência do auxílio por incapacidade temporária? Tenta lembrar.', kind: 'question' },
    { t: 6.3, text: '(pausa pra você responder de cabeça)', kind: 'pause' },
    { t: 10.6, text: 'Doze contribuições mensais, artigo 25, inciso I, da Lei 8.213.', kind: 'answer' },
    { t: 18.4, text: 'Doze contribuições: um ano pagando.', kind: 'answer' },
  ] as { t: number, text: string, kind: 'question' | 'pause' | 'answer' }[],
  bars: [0.47, 0.38, 0.56, 0.37, 0.04, 0.28, 0.47, 0.42, 0.3, 0.25, 0.31, 0.32, 0.47, 0.04, 0.04, 0.04, 0.04, 0.04, 0.04, 0.04, 0.04, 0.08, 1, 0.41, 0.31, 0.34, 0.31, 0.27, 0.25, 0.35, 0.37, 0.62, 0.29, 0.3, 0.08, 0.74, 0.35, 0.46, 0.39, 0.05],
}

/** The line being spoken at `seconds` (the first one before the voice starts). */
export function sampleLineAt(seconds: number): number {
  return ENTRY_SAMPLE.lines.reduce((cur, line, i) => (seconds >= line.t ? i : cur), 0)
}

/** "0:07" */
export function clock(seconds: number): string {
  const n = Math.max(0, Math.floor(seconds))
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`
}

// ── The plans, only from the catalog (RN-4) ──

/** The name of the paid plan: the catalog's, with the decided name as the fallback (the same rule as the landing). */
export function paidName(catalog: PlanCatalog | null): string {
  return catalog?.plans?.find(p => p.key === 'pro')?.name?.trim() || 'Intensivo'
}

/** The trial of the catalog, only when it needs no card (dormant since the Free's preview: trial null). */
function trialOf(catalog: PlanCatalog | null): CatalogTrial | null {
  const trial = catalog?.trial ?? catalog?.plans?.find(p => p.key === 'pro')?.trial ?? null
  return trial && trial.days > 0 && !trial.card_required ? trial : null
}

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

/** "R$ 34,90" (with a normal space: the number may wrap as one piece through CSS, not through a NBSP) */
export function brl(cents: number): string {
  return money.format(cents / 100).replace(/\s/g, ' ')
}

/** The paid plan's prices: monthly (big) and annual (the line under it); null before the catalog. */
export function paidPrices(catalog: PlanCatalog | null): { monthly: string | null, annual: string | null } | null {
  const prices = catalog?.plans?.find(p => p.key === 'pro')?.prices
  if (!prices) return null
  return {
    monthly: prices.monthly ? brl(prices.monthly.amount_cents) : null,
    annual: prices.annual ? brl(prices.annual.amount_cents) : null,
  }
}

/** What the Free has of the AI: the trial, the preview (the API's sentence, whole) or nothing. */
export function freeAiLine(catalog: PlanCatalog | null): string | null {
  const trial = trialOf(catalog)
  if (trial) return `Teste de ${trial.days} dias da IA no primeiro material, sem cartão`
  return catalog?.preview?.text ?? null
}

/** The lines of the two cards of step 7. */
export function planLines(catalog: PlanCatalog | null, key: 'free' | 'pro'): string[] {
  if (!catalog) return []
  if (key === 'free') {
    const ai = freeAiLine(catalog)
    return ['Revisar todos os seus cards, para sempre', ...(ai ? [ai] : [])]
  }
  const plan = catalog.plans?.find(p => p.key === 'pro')
  if (!plan) return []
  const benefits = (['pdf_to_note', 'quiz_ai', 'podcast'] as const)
    .filter(k => plan.limits[k] !== 0 && catalog.features[k]?.pro_benefit)
    .map(k => catalog.features[k]!.pro_benefit)
  return [...benefits, ...(plan.prices.monthly ? ['Sem fidelidade: o mensal cancela quando quiser'] : [])]
}

/** Under "Comece grátis hoje": reviewing is free; the AI sentence only when the catalog says how. */
export function finalLine(catalog: PlanCatalog | null): string {
  const free = 'Revisar não custa nada.'
  if (!catalog) return free
  const trial = trialOf(catalog)
  if (trial) return `${free} A IA você testa por ${trial.days} dias, sem cartão, com o seu material.`
  if (catalog.preview) return `${free} A IA tem uma prévia para você testar com o seu material.`
  return `${free} A IA fica no ${paidName(catalog)}.`
}

/** The episode's cap in minutes of the paid plan, or null (the sentence goes without the number). */
export function podcastMinutes(catalog: PlanCatalog | null): number | null {
  const minutes = catalog?.plans?.find(p => p.key === 'pro')?.extras?.podcast_max_minutes
  return minutes && minutes >= 1 ? minutes : null
}

/** The plan line of step 5: the paid plan's benefit and the Free's preview of the podcast, if any. */
export function podcastPlanLine(catalog: PlanCatalog | null): string | null {
  if (!catalog) return null
  const name = paidName(catalog)
  const benefit = catalog.features?.podcast?.pro_benefit
  const own = benefit ? `No ${name}: ${benefit.charAt(0).toLowerCase()}${benefit.slice(1)}.` : `Os episódios fazem parte do ${name}.`
  const seconds = !trialOf(catalog) && (catalog.preview?.limits?.podcast ?? 0) > 0 ? catalog.preview?.podcast_seconds : null
  return seconds ? `${own} No Grátis, uma prévia de ${seconds} s.` : own
}

