/**
 * Pure helpers of the conferred edital pages (prd-paginas-edital-publicas RF-W5..RF-W8, RF-W13): the H1, the <title>,
 * the description, the JSON-LD and the start links with UTM. No Vue here: tests/utils/editalPage.test.ts covers them.
 */
import type { EditalPage, EditalPageMeta } from '~~/modules/editais/types'
import { editalYear } from '~~/modules/editais/year'
import { PUBLISHER, SITE_URL } from '~/utils/seo'
import { editalFullDate, editalShortDate, type EditalStatus } from '~/utils/editalStatus'

export const EDITAIS_PATH = '/editais'
export const editalPagePath = (slug: string) => `${EDITAIS_PATH}/${slug}`

export type EditalPageCtaPosition = 'hero' | 'actions' | 'sticky' | 'footer'

/** "Edital verticalizado TJ-SP 2026: Escrevente Técnico Judiciário"; past the exam, the pre-edital H1 (§8.2, decision 1) */
export function editalH1(page: EditalPage, status: EditalStatus): string {
  const year = editalYear(page.slug)
  if (status.state === 'prova_realizada') return `Último edital do ${page.edital.orgao_sigla} (${year}): base para estudar antes do próximo`
  return `Edital verticalizado ${page.edital.orgao_sigla} ${year}: ${page.edital.cargo}`
}

/** <title> without the brand (useBlogSeo adds " · Baigi" when it fits): never the state (RF-W6) */
export function editalSeoTitle(page: Pick<EditalPage, 'slug' | 'edital'>): string {
  return `Edital verticalizado ${page.edital.orgao_sigla} ${editalYear(page.slug)} ${page.edital.cargo}`
}

/** ≤ 155 characters when it fits: the second sentence goes first (RF-W6) */
export function editalDescription(page: EditalPage): string {
  const { subjects, topics } = page.counts
  const first = `As ${subjects} matérias e ${topics} assuntos do edital ${page.edital.orgao_sigla} ${editalYear(page.slug)} para ${page.edital.cargo}, conferidos com o PDF oficial em ${editalShortDate(page.checked_at)}.`
  const full = `${first} Marque o que já estudou e monte o cronograma.`
  return full.length <= 155 ? full : first
}

/** "Conferido pelo Baigi com o {edital nº 02/2026} oficial em dd/mm/aaaa" in three parts (the middle is the link) */
export function editalTrustLine(page: EditalPage): { before: string, link: string, after: string } {
  return { before: 'Conferido pelo Baigi com o ', link: page.edital.numero, after: ` oficial em ${editalFullDate(page.checked_at)}` }
}

/** The CTA's UTM up to the sign-up, where the first touch is saved (RF-W13) */
export function editalUtm(slug: string, position: EditalPageCtaPosition): string {
  return new URLSearchParams({ utm_source: 'editais', utm_medium: 'organic', utm_content: `${slug}-${position}` }).toString()
}

export function editalStartPath(page: Pick<EditalPage, 'slug' | 'area'>, position: EditalPageCtaPosition = 'footer'): string {
  return `/comecar/${page.area === 'oab' ? 'oab' : 'concurso'}?${editalUtm(page.slug, position)}`
}

export function editalSignupPath(slug: string, position: EditalPageCtaPosition): string {
  return `/criar-conta?${editalUtm(slug, position)}`
}

/** Name of a page in links and lists: "TJ-SP 2026 · Escrevente Técnico Judiciário" */
export function editalShortName(meta: Pick<EditalPageMeta, 'orgao_sigla' | 'year' | 'cargo'>): string {
  return `${meta.orgao_sigla} ${meta.year} · ${meta.cargo}`
}

function breadcrumb(items: { name: string, path: string }[]) {
  return {
    '@type': 'BreadcrumbList',
    'itemListElement': items.map((item, i) => ({ '@type': 'ListItem', 'position': i + 1, 'name': item.name, 'item': `${SITE_URL}${item.path === '/' ? '/' : item.path}` })),
  }
}

/** WebPage + about GovernmentOrganization + BreadcrumbList (RF-W8, R5.3: no Event, Course nor FAQPage) */
export function editalPageJsonLd(page: EditalPage, h1: string, description: string, lastmod: string) {
  const url = `${SITE_URL}${editalPagePath(page.slug)}`
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': url,
        'name': h1,
        description,
        url,
        'inLanguage': 'pt-BR',
        'dateModified': lastmod,
        'isBasedOn': page.source_url,
        'about': { '@type': 'GovernmentOrganization', 'name': page.edital.orgao, 'alternateName': page.edital.orgao_sigla },
        'publisher': PUBLISHER,
      },
      breadcrumb([
        { name: 'Baigi', path: '/' },
        { name: 'Editais', path: EDITAIS_PATH },
        { name: `${page.edital.orgao_sigla} ${editalYear(page.slug)}`, path: editalPagePath(page.slug) },
      ]),
    ],
  }
}

/** CollectionPage + BreadcrumbList of /editais, listing the open pages (what the index shows first) */
export function editaisIndexJsonLd(title: string, description: string, open: Pick<EditalPageMeta, 'slug' | 'orgao_sigla' | 'year' | 'cargo'>[]) {
  const url = `${SITE_URL}${EDITAIS_PATH}`
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': url,
        'name': title,
        description,
        url,
        'inLanguage': 'pt-BR',
        'publisher': PUBLISHER,
        'mainEntity': {
          '@type': 'ItemList',
          'itemListElement': open.map((m, i) => ({ '@type': 'ListItem', 'position': i + 1, 'name': editalShortName(m), 'url': `${SITE_URL}${editalPagePath(m.slug)}` })),
        },
      },
      breadcrumb([{ name: 'Baigi', path: '/' }, { name: 'Editais', path: EDITAIS_PATH }]),
    ],
  }
}
