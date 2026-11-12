/**
 * What every public page needs for search, kept small: the landing imports it, and utils/blog (the articles) would
 * add ~2 KB to its route. The robots value and the JSON-LD escaping are here; the head itself is useBlogSeo.
 */
export const SITE_URL = 'https://baigi.com.br'
export const SITE_NAME = 'Baigi'

/** The `robots` of a public page; the app's default head says `noindex, follow` (nuxt.config.ts) */
export const INDEXABLE = 'index, follow, max-image-preview:large'

/** JSON inside <script>: `<` escaped so no text of an article can close the tag */
export function jsonLdScript(data: object): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}

/**
 * The brand's own profiles, for `sameAs` (diretorios-perfis.md §9): only profiles that are live. The Facebook Page
 * waits for its username (decision of 11/11); LinkedIn does not exist yet.
 */
export const BRAND_PROFILES = [
  'https://www.instagram.com/baigi.oficial/',
  'https://www.tiktok.com/@baigi.oficial',
  'https://www.youtube.com/@BaigiOficial',
] as const

export const PUBLISHER = {
  '@type': 'Organization',
  '@id': `${SITE_URL}/#organization`,
  'name': SITE_NAME,
  'url': `${SITE_URL}/`,
  'logo': { '@type': 'ImageObject', 'url': `${SITE_URL}/pwa-512x512.png` },
  'sameAs': [...BRAND_PROFILES],
}
/**
 * The home page's JSON-LD (Organization, WebSite and the app): only what the prerendered page shows. The free plan
 * is the one price in the raw HTML (the paid one comes from GET /api/plans on the client), so it is the only offer.
 */
export function homeJsonLd(description: string) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      PUBLISHER,
      { '@type': 'WebSite', '@id': `${SITE_URL}/#website`, 'name': SITE_NAME, 'url': `${SITE_URL}/`, 'inLanguage': 'pt-BR', 'publisher': { '@id': `${SITE_URL}/#organization` } },
      {
        '@type': 'SoftwareApplication',
        'name': SITE_NAME,
        'url': `${SITE_URL}/`,
        description,
        'applicationCategory': 'EducationalApplication',
        'operatingSystem': 'Web',
        'inLanguage': 'pt-BR',
        'publisher': { '@id': `${SITE_URL}/#organization` },
        'offers': { '@type': 'Offer', 'name': 'Grátis', 'price': '0', 'priceCurrency': 'BRL' },
      },
    ],
  }
}
