/**
 * Types and lists of the blog shared by the build (modules/blog) and the app (prd-blog-seo). No imports: the app pulls
 * this file into the browser bundle, and `marked` must stay on the build side.
 */
export const BLOG_CATEGORIES = {
  metodo: 'Método de estudo',
  concurso: 'Concurso',
  enem: 'ENEM e vestibular',
  oab: 'OAB',
  medicina: 'Medicina',
  idiomas: 'Idiomas',
  comparacao: 'Comparações',
} as const
export type BlogCategory = keyof typeof BLOG_CATEGORIES

/** Areas of the visitor's mini-lote (/comecar/{area}, prd-onboarding-v4) */
export const BLOG_AREAS = ['concurso', 'enem', 'medicina', 'oab', 'ingles', 'faculdade'] as const
export type BlogArea = typeof BLOG_AREAS[number]

export const BLOG_TOOLS = ['calculadora-do-esquecimento', 'plano-ate-a-prova'] as const
export type BlogTool = typeof BLOG_TOOLS[number]

/**
 * Real screens of the app already captured for the landing (e2e/landing/shots.ts, demo account): `light` and `dark`
 * are paths under /public without the extension (.avif and .webp exist for each). Only real screens (RN-2).
 */
export const BLOG_SHOTS = {
  'revisao': { light: '/landing/revisao-light', dark: '/landing/revisao-dark', width: 780, height: 944, alt: 'Revisão no Baigi: o card "Quanto vale o auxílio-acidente?" com a resposta e os botões de avaliação' },
  'hoje-prova': { light: '/landing/hoje-tela-light', dark: '/landing/hoje-tela-dark', width: 780, height: 1688, alt: 'Tela Hoje do Baigi com a prova Técnico do INSS em 45 dias, os lotes do dia e quanto você deve lembrar na prova' },
  'material': { light: '/landing/video/material-light-poster', dark: '/landing/video/material-light-poster', width: 390, height: 844, alt: 'Material de um PDF no Baigi, dividido em partes, com os cards criados a partir dele' },
  'simulado': { light: '/landing/video/simulado-light-poster', dark: '/landing/video/simulado-dark-poster', width: 390, height: 844, alt: 'Resultado de um simulado no Baigi com o acerto por assunto e as questões erradas que viram card' },
  'enem': { light: '/landing/enem-light', dark: '/landing/enem-dark', width: 780, height: 680, alt: 'Revisão de um card de ENEM no Baigi' },
  'oab': { light: '/landing/oab-light', dark: '/landing/oab-dark', width: 780, height: 640, alt: 'Revisão de um card de OAB no Baigi' },
  'anatomia': { light: '/landing/anatomia-light', dark: '/landing/anatomia-dark', width: 780, height: 640, alt: 'Revisão de um card de anatomia no Baigi' },
  'ingles': { light: '/landing/ingles-light', dark: '/landing/ingles-dark', width: 780, height: 640, alt: 'Revisão de um card de inglês no Baigi' },
} as const
export type BlogShot = keyof typeof BLOG_SHOTS

/** Icons of the article's facts (prd-blog-v2 RF-V2): app/components/blog/Cover.vue maps each one to a lucide icon and a tone */
export const BLOG_FACT_ICONS = ['calendar', 'questions', 'target', 'clock', 'money', 'chart'] as const
export type BlogFactIcon = typeof BLOG_FACT_ICONS[number]
/** The number of the cover: only a number written in the article itself (checked by the module) */
export interface BlogCover { value: string, label: string }
export interface BlogFact extends BlogCover { icon: BlogFactIcon }

/** Dot color of each category (a subject tone of UiSubjectMark; never purple, the action's color) */
export const BLOG_CATEGORY_TONE: Record<BlogCategory, string> = {
  metodo: 'green',
  concurso: 'blue',
  enem: 'amber',
  oab: 'orange',
  medicina: 'pink',
  idiomas: 'slate',
  comparacao: 'teal',
}

export interface QuizCard { q: string, a: string, source?: string }
export type BlogSegment =
  | { kind: 'html', html: string }
  | { kind: 'quiz', area: BlogArea, title?: string, cards: QuizCard[] }
  | { kind: 'cta', area: BlogArea, text: string }
  | { kind: 'tool', tool: BlogTool }
  | { kind: 'card', q: string, a: string, source?: string }
  | { kind: 'shot', shot: BlogShot, caption: string }

export interface BlogMeta {
  slug: string
  title: string
  /** <title> when the H1 is too long for the result page */
  seoTitle: string
  description: string
  category: BlogCategory
  area: BlogArea
  author: string
  published: string
  updated: string
  readingMinutes: number
  tags: string[]
  image: string | null
  /** The 2-3 sentence answer under the H1 (the snippet an AI overview can quote) */
  summary: string | null
  pillar: string | null
  related: string[]
  /** What the article is about, next to the category ("TJ-SP Escrevente") */
  context: string | null
  /** The big number of the cover (index cards and article header); null = the cover shows only the category */
  cover: BlogCover | null
  /** Up to 3 facts under the cover in the article header */
  facts: BlogFact[]
  /** The highlight of /blog (at most one; without it, the newest article) */
  featured: boolean
}

export interface BlogArticle extends BlogMeta {
  toc: { id: string, title: string }[]
  faq: { q: string, a: string }[]
  segments: BlogSegment[]
  /** Internal links found in the text (checked against the known routes by the module) */
  links: string[]
}

