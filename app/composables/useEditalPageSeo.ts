/**
 * Head of a conferred edital page (prd-paginas-edital-publicas RF-W6, RF-W8, R5.4, R5.9): title and description that
 * never tell the state, canonical to itself, the generic share image of the tools (decision 3 of §8.2), the JSON-LD
 * (WebPage + BreadcrumbList) and `noindex, follow` when the build's day is past the exam or the contest was cancelled.
 */
import type { EditalPage } from '~~/modules/editais/types'
import { editalLastmod } from '~~/modules/editais/lastmod'
import type { EditalStatus } from '~/utils/editalStatus'
import { editalDescription, editalH1, editalPageJsonLd, editalPagePath, editalSeoTitle } from '~/utils/editalPage'

export function useEditalPageSeo(page: EditalPage, buildStatus: EditalStatus) {
  const description = editalDescription(page)
  useBlogSeo({
    title: editalSeoTitle(page),
    description,
    path: editalPagePath(page.slug),
    modified: editalLastmod(page),
    noindex: !buildStatus.open,
    jsonLd: [editalPageJsonLd(page, editalH1(page, buildStatus), description, editalLastmod(page))],
  })
}
