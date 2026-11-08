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
  /** The author page ("Quem faz o Baigi" for the founder; the Mercado Pago checkout links to /quem-faz) */
  page: string
  /** Real photo sent by the person (no EXIF), without extension: .avif and .webp, 320x320 */
  photo: string | null
}

export const BLOG_AUTHORS: Record<string, BlogAuthor> = {
  weslley: {
    id: 'weslley',
    name: 'Weslley Araujo',
    role: 'Desenvolvedor e criador do Baigi',
    bio: 'Sou desenvolvedor e criei o Baigi porque esquecia quase tudo o que estudava poucas semanas depois. Escrevo aqui o que aprendi lendo as pesquisas sobre memória e construindo o algoritmo de revisão do app. Não sou professor nem cursinho: cada artigo cita as fontes para você conferir.',
    experience: [
      'Implementei no Baigi o FSRS-6, o algoritmo de repetição espaçada de código aberto usado também pelo Anki.',
      'Li e resumi as pesquisas citadas nos artigos (prática de recuperação, espaçamento, autoavaliação).',
      'Montei os cadernos de exemplo do app a partir do texto da lei e de livros-texto, com a fonte no verso de cada card.',
    ],
    sameAs: [],
    page: '/quem-faz',
    photo: '/quem-faz/weslley',
  },
}
