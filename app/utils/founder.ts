/**
 * Who makes the Baigi (/quem-faz, prd-blog-v2 RF-Q1): the founder's page keeps his name and photo (decision of 11/11),
 * but the blog is signed by the brand (modules/blog/authors.ts) and never reads this file. Only "Weslley Araujo" is
 * written here: the full name appears in the bank app at payment time and stays out of the page; the CPF, nowhere.
 * Real photo sent by him, no EXIF (public/quem-faz, out of the precache).
 */
import { SITE_URL } from '~/utils/seo'

export const FOUNDER = {
  name: 'Weslley Araujo',
  role: 'Desenvolvedor de software e criador do Baigi',
  jobTitle: 'Desenvolvedor de software',
  experience: [
    'Desenvolvo software há mais de 5 anos.',
    'Usei o Anki por muito tempo para estudar inglês, e é dessa experiência que vem boa parte do Baigi.',
    'Implementei no Baigi o FSRS-6, o algoritmo de repetição espaçada de código aberto que o Anki oferece como opção desde 2023.',
    'Li e resumi as pesquisas citadas no blog (prática de recuperação, espaçamento, autoavaliação).',
    'Montei os cadernos de exemplo do app a partir do texto da lei e de livros-texto, com a fonte no verso de cada card.',
  ],
  knowsAbout: ['Desenvolvimento de software', 'Repetição espaçada', 'FSRS', 'Anki', 'Estudo de inglês'],
  sameAs: [] as string[],
  page: '/quem-faz',
  /** Without extension: .avif and .webp, 320x320 */
  photo: '/quem-faz/weslley',
} as const

export function founderJsonLd() {
  return {
    '@type': 'Person',
    'name': FOUNDER.name,
    'jobTitle': FOUNDER.jobTitle,
    'knowsAbout': [...FOUNDER.knowsAbout],
    'url': `${SITE_URL}${FOUNDER.page}`,
    'image': `${SITE_URL}${FOUNDER.photo}.webp`,
    ...(FOUNDER.sameAs.length ? { sameAs: [...FOUNDER.sameAs] } : {}),
  }
}
