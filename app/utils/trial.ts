import type { CatalogTrial, PlanCatalog, User } from '~/types'
import { formatBillingDayMonth } from '~/utils/billing'
import { daysAgo } from '~/utils/greeting'

/**
 * The paid plan and its 7-day trial on screen (prd-planos-lancamento §3.2). The plan's name comes from the
 * catalog (GET /plans, `plans[].name` of `pro`); this name only shows while the catalog is not at hand
 * (decisão do dono, 2026-11: the plan is called "Intensivo"). Keys, routes and events stay `pro`.
 */
export const PRO_NAME_FALLBACK = 'Intensivo'

export function proPlanName(catalog: PlanCatalog | null | undefined): string {
  return catalog?.plans?.find(p => p.key === 'pro')?.name || PRO_NAME_FALLBACK
}

/**
 * The trial of the catalog (`trial` on the root, or on the Pro plan), only when it needs no card. Same rule as
 * catalogTrial of utils/landing.ts, kept here so the app's chunks do not pull the landing's copy module.
 */
export function offeredTrial(catalog: PlanCatalog | null | undefined): CatalogTrial | null {
  const trial = catalog?.trial ?? catalog?.plans?.find(p => p.key === 'pro')?.trial ?? null
  return trial && trial.days > 0 && !trial.card_required ? trial : null
}

/**
 * "20 gerações de cards com IA, 30 perguntas ao tira-dúvidas, 3 PDFs transformados em nota (100 páginas no total) e
 * 3 simulados com IA" — the trial's quotas for its whole period (catalog `trial.limits`, labels of `features`), in
 * the catalog's order; what is out of it (0) is left out. Empty without the limits.
 */
export function trialLimitsText(catalog: PlanCatalog | null | undefined): string {
  const trial = offeredTrial(catalog)
  if (!trial?.limits || !catalog) return ''
  const parts = Object.entries(catalog.features).flatMap(([key, f]) => {
    const limit = trial.limits?.[key]
    if (limit === 0 || limit === undefined) return []
    if (limit === null) return [`${f.label} sem limite`]
    const pages = key === 'pdf_to_note' && trial.pdf_pages_cap ? ` (${trial.pdf_pages_cap} páginas no total)` : ''
    return [`${limit} ${f.label}${pages}`]
  })
  if (parts.length < 2) return parts.join('')
  return `${parts.slice(0, -1).join(', ')} e ${parts[parts.length - 1]}`
}

/** Study days (Brasília) until the trial's last day: 0 = it ends today, 1 = tomorrow; null without a date. */
export function trialDaysLeft(endsAt: string | null | undefined, now: Date = new Date()): number | null {
  const ago = daysAgo(endsAt, now)
  return ago === null ? null : -ago
}

/** "Intensivo grátis até 12/11"; on the last two days, "Seu Intensivo grátis acaba amanhã" or "… acaba hoje". */
export function trialEndsLine(name: string, endsAt: string | null | undefined, now: Date = new Date()): string {
  const left = trialDaysLeft(endsAt, now)
  if (left !== null && left <= 0) return `Seu ${name} grátis acaba hoje`
  if (left === 1) return `Seu ${name} grátis acaba amanhã`
  return `${name} grátis até ${formatBillingDayMonth(endsAt)}`
}

/** The invitation while the trial is available: the days come from the catalog, never written by hand. */
export function trialInvite(name: string, days: number): string {
  return `Mande seu primeiro material e ganhe ${days} dias do ${name}`
}

/** The Pro's quality gates (50 questions, the AI map, the simulado do caderno) hold in the trial too (RN-03). */
export function hasProAccess(user: User | null | undefined): boolean {
  return user?.plan === 'pro' || user?.trial?.status === 'active'
}

/**
 * A Free account whose trial opens on the next material or AI action (verified e-mail, RN-02): the client
 * never blocks that click by the quota of /usage (0 on Free); the server opens the trial and answers.
 */
export function opensTrialOnUse(user: User | null | undefined): boolean {
  return !!user && user.plan !== 'pro' && user.trial?.status === 'available' && !!user.email_verified
}

/** The trial ran and is over ("used" also covers an account that never had one, such as an ex-Pro). */
export function trialEnded(user: User | null | undefined): boolean {
  return !!user && user.plan !== 'pro' && user.trial?.status === 'used' && !!user.trial.started_at
}

/**
 * POSTs that can open the trial on the server (the first material or an AI action): after one of them, while
 * the trial is available, the client reads /me again so the screen shows the trial. Reviews never match.
 */
const TRIAL_TRIGGERS = /\/(topics\/[^/]+\/notes(\/[^/]+\/improve)?|ai\/[a-z-]+|chat|quizzes|(notes|topics)\/[^/]+\/mindmap\/generate|flashcards\/from-image|documents(\/[^/]+\/[a-z-]+)?)$/

export function opensTrialRequest(method: string | undefined, url: string): boolean {
  if ((method ?? 'GET').toUpperCase() !== 'POST') return false
  return TRIAL_TRIGGERS.test(url.split('?')[0]!.replace(/\/+$/, ''))
}
