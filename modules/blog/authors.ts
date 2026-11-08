/**
 * Authors of the blog (prd-blog-seo RF-B7). Only real people with what they really did: no invented credential
 * (marketing-organico §2). `sameAs` goes into the Person of the structured data; fill it in when the profiles exist.
 */
export interface BlogAuthor {
  id: string
  name: string
  role: string
  /** One paragraph, first person, shown on the article and on the author page */
  bio: string
  /** What the person did that backs the texts (E-E-A-T "experience"), listed on the author page, in the first person */
  experience: string[]
  sameAs: string[]
  /** Topics of the person's real experience (schema.org knowsAbout) */
  knowsAbout: string[]
  /** The author page ("Quem faz o Baigi" for the founder; the Mercado Pago checkout links to /quem-faz) */
  page: string
  /** Real photo sent by the person (no EXIF), without extension: .avif and .webp, 320x320 */
  photo: string | null
}

export const BLOG_AUTHORS: Record<string, BlogAuthor> = {
  weslley: {
    id: 'weslley',
    name: 'Weslley Araujo',
    role: 'Desenvolvedor de software e criador do Baigi',
    bio: 'Sou desenvolvedor de software há mais de 5 anos. Estudava inglês com o Anki e fazia resumos, e mesmo assim esquecia. Criei o Baigi para o meu inglês e para ajudar minha namorada a passar no concurso.',
    experience: [
      'Desenvolvo software há mais de 5 anos.',
      'Usei o Anki por muito tempo para estudar inglês, e é dessa experiência que vem boa parte do Baigi.',
      'Implementei no Baigi o FSRS-6, o algoritmo de repetição espaçada de código aberto que o Anki também usa.',
      'Li e resumi as pesquisas citadas nos artigos (prática de recuperação, espaçamento, autoavaliação).',
      'Montei os cadernos de exemplo do app a partir do texto da lei e de livros-texto, com a fonte no verso de cada card.',
    ],
    sameAs: [],
    knowsAbout: ['Desenvolvimento de software', 'Repetição espaçada', 'FSRS', 'Anki', 'Estudo de inglês'],
    page: '/quem-faz',
    photo: '/quem-faz/weslley',
  },
}
