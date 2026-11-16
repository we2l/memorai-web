import type { CatalogPreview, FeatureData, PlanCatalog, User } from '~/types'

/**
 * The Free's preview of the AI (prd-uso-justo §9, in place of the 7-day trial): every AI feature a few times, once
 * per account and with no deadline, with a verified e-mail. Its quotas and its sentence come from the catalog
 * (`preview`); /usage says `period: lifetime` while the account is on it.
 */
export function catalogPreview(catalog: PlanCatalog | null | undefined): CatalogPreview | null {
  return catalog?.preview ?? null
}

/** The catalog has the preview and the account is on the Free (the trial and the paid plan have their own quotas). */
export function hasPreview(catalog: PlanCatalog | null | undefined, user: User | null | undefined): boolean {
  return !!catalogPreview(catalog) && !!user && user.plan !== 'pro' && user.trial?.status !== 'active'
}

/** The preview includes this feature (limit > 0): the screen offers the action instead of the paywall. */
export function previewIncludes(catalog: PlanCatalog | null | undefined, feature: string): boolean {
  return (catalogPreview(catalog)?.limits?.[feature] ?? 0) > 0
}

export interface PreviewNotice {
  kind: 'preview' | 'spent'
  text: string
}

/**
 * The preview's line where the AI action happens: "Prévia grátis: 3 de 10 gerações de cards com IA." and, once
 * spent, the invitation to the paid plan. Null for what the preview leaves out (limit 0 or null).
 */
export function previewNotice(f: FeatureData | null | undefined, label: string, proName: string, canSubscribe = true): PreviewNotice | null {
  if (!f || !f.limit || f.limit <= 0) return null
  const left = f.remaining ?? Math.max(0, f.limit - f.used)
  if (left > 0) return { kind: 'preview', text: `Prévia grátis: ${f.used} de ${f.limit} ${label}.` }
  // Checkout closed ("Assinatura em breve", utils/checkout.ts): the invitation still leads to /planos, which says so
  const invite = canSubscribe ? `No ${proName}, a IA tem cota todo mês.` : `No ${proName}, a IA tem cota todo mês; a assinatura abre em breve.`
  return { kind: 'spent', text: `Você usou a prévia grátis de ${label}. ${invite}` }
}

/**
 * The size of the preview where the own material starts (prd-ativacao-material-proprio H7): "Na prévia grátis: 1 PDF
 * de até 50 páginas e 10 gerações de cards." Numbers from GET /plans → preview only; null without them (never a
 * number written by hand).
 */
export function previewMaterialLine(preview: CatalogPreview | null | undefined): string | null {
  const pdfs = preview?.limits?.pdf_to_note ?? 0
  const cards = preview?.limits?.cards_ai ?? 0
  const pages = preview?.pdf_pages ?? 0
  const parts: string[] = []
  if (pdfs > 0 && pages > 0) parts.push(`${pdfs} ${pdfs === 1 ? 'PDF' : 'PDFs'} de até ${pages} páginas`)
  if (cards > 0) parts.push(`${cards} ${cards === 1 ? 'geração' : 'gerações'} de cards`)
  return parts.length ? `Na prévia grátis: ${parts.join(' e ')}.` : null
}
