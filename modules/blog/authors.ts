/**
 * Authors of the blog (prd-blog-seo RF-B7, prd-blog-v2 RF-A1). The blog is signed by the brand (decision of 11/11):
 * no person's name, photo or CPF in it. Only what is true of the product goes here: no invented credential
 * (marketing-organico §2) and no fake author with name and photo (Google's policy). The founder's page (/quem-faz)
 * reads its own data from app/utils/founder.ts. An unknown `author:` in an article fails the build.
 */
export interface BlogAuthor {
  id: string
  name: string
  role: string
  /** One paragraph, first person plural, shown on the about page of the blog */
  bio: string
  /** What backs the texts (E-E-A-T "experience"), listed on the about page */
  experience: string[]
  sameAs: string[]
  /** Topics of the texts (schema.org knowsAbout) */
  knowsAbout: string[]
  /** The author page (/blog/sobre for the brand) */
  page: string
  /** Real photo, without extension: .avif and .webp, 320x320. The brand has none (it shows the mascot) */
  photo: string | null
  /** The brand as the author: the official dolphin in place of a photo and an Organization in the structured data */
  mascot?: boolean
}

export const BLOG_AUTHORS: Record<string, BlogAuthor> = {
  baigi: {
    id: 'baigi',
    name: 'Baigi',
    role: 'App de revisão com repetição espaçada',
    bio: 'O Baigi é um app de revisão para quem estuda para prova. Escrevemos sobre o método que o app usa: tentar lembrar antes de ver a resposta e revisar no dia certo, com a fonte de cada fato para você conferir.',
    experience: [
      'O Baigi agenda as revisões com o FSRS-6, o algoritmo de repetição espaçada de código aberto que o Anki também oferece.',
      'Cada artigo cita as fontes primárias no fim: o edital, o texto da lei no Planalto e os estudos sobre memória.',
      'Os cadernos de exemplo do app são montados a partir do texto da lei e de livros-texto, com a fonte no verso de cada card.',
    ],
    sameAs: [],
    knowsAbout: ['Repetição espaçada', 'FSRS', 'Prática de recuperação', 'Estudo para concurso', 'Exame de Ordem', 'Anki'],
    page: '/blog/sobre',
    photo: null,
    mascot: true,
  },
}
