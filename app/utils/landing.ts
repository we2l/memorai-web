import type { InjectionKey } from 'vue'
import type { CatalogTrial, PlanCatalog } from '~/types'
import type { LandingCtaPosition } from '~/types/analytics'
import { trialLimitsText } from '~/utils/trial'
import { PODCAST_SAMPLE } from '~/utils/podcastSample'

/**
 * Copy and data of the landing D (prd-landing-d; prototype docs/research/assets/landing-prototipo/d.html). Every
 * sentence is something the product does today (prd-landing-v4 §5.1). Prices, the trial and the name of the paid
 * plan never live here: they come from GET /api/plans. The numbers of the demo account (Técnico do INSS, 45 dias,
 * 90%, 75%, 7 de 10) are the ones of the recorded screens (assets/landing/demo.json).
 */

/** `?m=` of the short video that brought the visitor; anything else is the default message. */
export const LANDING_MESSAGES = ['prova', 'esqueci', 'faculdade', 'ingles'] as const
export type LandingMessage = typeof LANDING_MESSAGES[number] | 'padrao'

export function landingMessageOf(raw: unknown): LandingMessage {
  return typeof raw === 'string' && (LANDING_MESSAGES as readonly string[]).includes(raw) ? raw as LandingMessage : 'padrao'
}

/**
 * Runs in the <head> of the prerendered page, before the first paint:
 * - the variant of `?m=` is picked by CSS (landing.css, html[data-m]): no flash, no layout shift, no hydration mismatch;
 * - html.lp-motion turns the motion on (entrance, reveal, counters) only when the system allows it. If the page's JS
 *   never runs (window.__lpReady stays unset), the class goes away after 6 s, so nothing stays hidden.
 */
export const LANDING_MESSAGE_SCRIPT = `(function(){var d=document.documentElement;try{window.__baigiLandingQuery=location.search;var m=new URLSearchParams(location.search).get('m');if(${JSON.stringify(LANDING_MESSAGES)}.indexOf(m)>=0)d.setAttribute('data-m',m)}catch(e){window.__baigiLandingQuery=''}try{if(!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)){d.classList.add('lp-motion');setTimeout(function(){if(!window.__lpReady)d.classList.remove('lp-motion')},6000)}}catch(e){d.classList.remove('lp-motion')}})()`

/**
 * The query of the first load, kept by LANDING_MESSAGE_SCRIPT: Nuxt takes the query out of the address while it
 * hydrates a prerendered page, so `location.search` in onMounted can come back empty.
 */
export function landingQuery(): URLSearchParams {
  const kept = (window as unknown as { __baigiLandingQuery?: string }).__baigiLandingQuery
  return new URLSearchParams(kept ?? window.location.search)
}

/** Real screens of the app (e2e/landing/shots.ts) in public/landing, 390 CSS px wide at 2x. */
export const SCREENS = {
  'hoje-tela': { height: 844, alt: 'Tela real do Hoje na conta de demonstração: o plano do dia e a prova de Técnico do INSS em 45 dias, chegando à prova lembrando 90% mantendo o ritmo.' },
  'revisao': { height: 538, alt: 'Tela real da revisão na conta de demonstração: o card “Quanto vale o auxílio-acidente?” virado, com a origem dele na apostila de Seguridade Social.' },
  'anatomia': { height: 355, alt: 'Tela real da revisão de Anatomia na conta de demonstração: o card sobre o principal músculo da inspiração, com a resposta.' },
  'oab': { height: 416, alt: 'Tela real da revisão para a OAB na conta de demonstração: o card sobre o prazo da contestação no CPC, com a resposta.' },
  'enem': { height: 440, alt: 'Tela real da revisão para o ENEM na conta de demonstração: o card sobre a 1ª Lei de Mendel, com a resposta.' },
  'ingles': { height: 353, alt: 'Tela real da revisão de inglês na conta de demonstração: o card “I’m looking forward to it”, com a tradução.' },
} as const
export type ScreenName = keyof typeof SCREENS

/** Real recordings of the app (public/landing/video): muted loops, a poster each; `dark` when there is a dark take. */
export const CLIPS = {
  revisao: { dark: true, alt: 'Gravação do app na conta de demonstração: a revisão em lote da apostila de Seguridade Social, com os cards virando.' },
  material: { dark: false, alt: 'Gravação do app na conta de demonstração: a parte “Benefícios” da apostila de Seguridade Social e os cards dela.' },
  simulado: { dark: true, alt: 'Gravação do app na conta de demonstração: o resultado de um simulado de Fisiologia, 7 de 10, e os 3 erros virando cards.' },
} as const
export type ClipName = keyof typeof CLIPS

/**
 * A hero variant. `lines` are the lines of the <h1>; the text between asterisks gets the lilac highlighter (always
 * "peixe"). The phone shows a clip or a still screen, and the dolphin says `bubble`.
 */
export interface HeroVariant {
  key: LandingMessage
  lines: string[]
  lead: string
  media: { clip: ClipName } | { screen: ScreenName }
  bubble: string
  /** The lead sells the AI: the line under the call says which plan has it (landingAiLine) */
  ai?: boolean
}

export const HERO_VARIANTS: HeroVariant[] = [
  {
    key: 'padrao',
    lines: ['Chega de', 'memória', 'de *peixe*.'],
    lead: 'Leu ontem e hoje não lembra nada? Acontece com quem não revisa. O Baigi traz cada card de volta perto da hora de esquecer e mostra quanto você vai lembrar no dia da prova.',
    media: { clip: 'revisao' },
    bubble: 'Faltam 45 dias pra prova do INSS. Hoje são 3 lotes de 20.',
  },
  {
    key: 'prova',
    lines: ['Até a prova,', 'sem memória', 'de *peixe*.'],
    lead: 'Marque a data. O Baigi divide a revisão de cada dia em lotes de 10 a 30 cards e mostra quanto você vai lembrar na prova: mantendo o ritmo e se parar hoje.',
    media: { screen: 'hoje-tela' },
    bubble: 'Faltam 45 dias pra prova do INSS. Hoje são 3 lotes de 20.',
  },
  {
    key: 'esqueci',
    lines: ['Leu ontem,', 'esqueceu hoje?', 'Memória de *peixe*.'],
    lead: 'Você não esquece por falta de esforço. Esquece por falta de revisão. O Baigi traz cada card de volta perto da hora de esquecer, em lotes curtos e com fim.',
    media: { screen: 'revisao' },
    bubble: 'Esse card volta amanhã. Os outros, mais pra frente.',
  },
  {
    key: 'faculdade',
    lines: ['Faculdade', 'sem memória', 'de *peixe*.'],
    lead: 'Mande o PDF da matéria, de Anatomia a Cálculo. O Baigi escreve a nota em partes, já com os cards das primeiras, e divide a revisão do dia em lotes curtos.',
    media: { screen: 'anatomia' },
    bubble: 'Os slides viraram cards. Cada um diz de onde saiu.',
    ai: true,
  },
  {
    key: 'ingles',
    lines: ['Inglês', 'sem memória', 'de *peixe*.'],
    lead: 'Crie cards de palavras e frases, por texto ou foto, ou traga seus baralhos do Anki. Cada palavra volta perto da hora de esquecer.',
    media: { screen: 'ingles' },
    bubble: 'Essa palavra volta amanhã. Aquela, semana que vem.',
    ai: true,
  },
]

/** A line of the title split around the highlighter: odd parts are highlighted. */
export function titleParts(line: string): { text: string, mark: boolean }[] {
  return line.split('*').map((text, i) => ({ text, mark: i % 2 === 1 })).filter(p => p.text)
}

/** "Como funciona": the phone stays (desktop) and the screen changes, only material and review (owner, 06/11). */
export const STORY = [
  {
    key: 'material',
    step: '1 · Material',
    title: 'Manda a apostila. O Baigi faz os cards.',
    text: 'O PDF vira uma nota em partes, e as primeiras já saem com cards. Nas outras, é um toque. Cada card mostra de que parte do PDF saiu.',
    ai: true,
    clip: 'material',
    cta: 'Testar com meu PDF',
    position: 'story_material',
    pose: 'thinking',
  },
  {
    key: 'revisao',
    step: '2 · Revisão',
    title: 'Todo dia um número, em lotes curtos.',
    text: 'Abriu o app e viu 400 cards atrasados? Aqui eles vêm em lotes: você escolhe o tamanho, de 10 a 30 cards, e quantos por dia. Faz um, vê quantos faltam e decide se para ou segue.',
    ai: false,
    clip: 'revisao',
    cta: 'Fazer meu primeiro lote',
    position: 'story_review',
    pose: 'standing',
  },
] as const

/** The areas, one open at a time: the pain, what the app does, a real screen and its own call. */
export const AREAS = [
  {
    key: 'concurso',
    name: 'Concurso',
    dot: 'bg-subject-1',
    pain: 'Uma semana depois, já esqueceu tudo da matéria.',
    points: [
      ['Marque a data da prova.', 'O Baigi mostra quantos cards por dia até lá e põe as matérias da prova na frente.'],
      ['Simulado por matéria.', 'Você vê o acerto de cada assunto, de Benefícios a Português, e os erros já viram card.'],
      ['A projeção.', 'Quanto você vai lembrar no dia, mantendo o ritmo ou se parar hoje.'],
    ],
    cta: 'Começar pelo meu concurso',
    screen: 'revisao',
  },
  {
    key: 'faculdade',
    name: 'Medicina e faculdade',
    dot: 'bg-subject-2',
    pain: '300 cards por dia e a fila nunca acaba.',
    points: [
      ['Lotes de 20 com fim.', 'Fez um, sabe quantos faltam e decide se segue.'],
      ['Atrasou?', 'O modo recuperação começa pelos 20 mais urgentes, sem a montanha toda na cara.'],
      ['Os slides da aula em PDF viram cards,', 'cada um com a parte de onde saiu.'],
    ],
    cta: 'Começar pela minha faculdade',
    screen: 'anatomia',
  },
  {
    key: 'oab',
    name: 'OAB',
    dot: 'bg-subject-3',
    pain: 'Fez a segunda fase e já esqueceu boa parte.',
    points: [
      ['Prazos e artigos em cards,', 'saídos do seu material, com o trecho pra conferir.'],
      ['Questões do seu material,', 'com o acerto por matéria no fim.'],
      ['Data do exame marcada,', 'e as matérias dele vêm na frente da revisão.'],
    ],
    cta: 'Começar pela OAB',
    screen: 'oab',
  },
  {
    key: 'enem',
    name: 'ENEM e vestibular',
    dot: 'bg-subject-4',
    pain: 'Criar card dá uma preguiça que você desiste antes de começar.',
    points: [
      ['Tira foto do resumo', 'e os cards saem dali.'],
      ['Lote curto no metrô.', '20 cards e pronto.'],
      ['Errou no simulado?', 'A questão vira card com o comentário no verso.'],
    ],
    cta: 'Começar pelo ENEM',
    screen: 'enem',
  },
  {
    key: 'idiomas',
    name: 'Idiomas',
    dot: 'bg-subject-6',
    pain: 'Fazer card de vocabulário na mão cansa.',
    points: [
      ['Palavras e frases por texto ou foto', 'viram cards.'],
      ['Traga seus baralhos do Anki', 'sem recomeçar do zero: vêm o intervalo e os erros de cada card.'],
      ['Sem data de prova?', 'Tudo bem. Cada palavra volta perto da hora de esquecer.'],
    ],
    cta: 'Começar pelo meu inglês',
    screen: 'ingles',
  },
] as const satisfies readonly { key: string, name: string, dot: string, pain: string, points: readonly (readonly [string, string])[], cta: string, screen: ScreenName }[]
export type LandingArea = typeof AREAS[number]['key']

/**
 * Where the call of an area starts the visitor's mini-lote (prd-onboarding-v4 RF-F7): straight to the area's cards;
 * "Medicina e faculdade" covers two of them, so it opens the choice.
 */
export function areaStartPath(key: LandingArea): string {
  const area = { concurso: 'concurso', oab: 'oab', enem: 'enem', idiomas: 'ingles', faculdade: null }[key]
  return area ? `/comecar/${area}?from=landing` : '/comecar'
}

/**
 * The real sample of the podcast (utils/podcastSample.ts, shared with the paywall of the app) plus the waveform the
 * landing draws.
 */
export const SAMPLE = {
  ...PODCAST_SAMPLE,
  /** RMS of the file in 120 slices */
  peaks: [0.04, 0.04, 0.04, 0.08, 0.53, 0.64, 0.49, 0.58, 0.44, 0.39, 0.72, 0.57, 0.28, 0.36, 0.34, 0.64, 0.29, 0.41, 0.21, 0.21, 0.73, 0.09, 0.04, 0.04, 0.04, 0.4, 0.4, 0.81, 0.41, 0.67, 0.35, 0.86, 0.27, 0.32, 0.04, 0.04, 0.04, 0.57, 0.46, 0.78, 0.46, 0.48, 0.58, 0.37, 0.15, 0.04, 0.04, 0.04, 0.06, 0.04, 0.04, 0.04, 0.04, 0.06, 0.04, 0.04, 0.04, 0.04, 0.04, 0.06, 0.04, 0.04, 0.04, 0.04, 0.06, 0.04, 0.04, 0.04, 0.04, 0.63, 0.58, 0.49, 0.52, 0.57, 0.24, 1.0, 0.56, 0.52, 0.25, 0.09, 0.04, 0.04, 0.82, 0.51, 0.47, 0.51, 0.54, 0.54, 0.38, 0.38, 0.39, 0.74, 0.5, 0.31, 0.58, 0.5, 0.59, 0.26, 0.62, 0.74, 0.35, 0.41, 0.54, 0.46, 0.73, 0.65, 0.35, 0.47, 0.3, 0.32, 0.38, 0.56, 0.15, 0.33, 0.4, 0.2, 0.35, 0.38, 0.17, 0.04],
}

// ── The plans, only from the catalog ──

/** The trial of the catalog (root or the paid plan), only when it needs no card. */
export function catalogTrial(catalog: PlanCatalog | null): CatalogTrial | null {
  const trial = catalog?.trial ?? catalog?.plans?.find(p => p.key === 'pro')?.trial ?? null
  return trial && trial.days > 0 && !trial.card_required ? trial : null
}

/** The name of the paid plan ("Intensivo", owner 06/11): the catalog's, with the decided name as the fallback. */
export function paidPlanName(catalog: PlanCatalog | null): string {
  return catalog?.plans?.find(p => p.key === 'pro')?.name?.trim() || 'Intensivo'
}

const LINES_PER_PLAN = 5
const PAID_BENEFITS = ['pdf_to_note', 'quiz_ai', 'podcast'] as const

/**
 * The 5 lines of each card (prd-landing-d §5.2), from the catalog only.
 * - free: its highlights without the one about the trial (up to 4) and the trial line, when the catalog has one;
 * - paid: its first 2 highlights and the pro_benefit of PDF, questões and podcast, completed with its other highlights.
 */
export function landingPlanLines(catalog: PlanCatalog | null, key: 'free' | 'pro'): string[] {
  const plan = catalog?.plans?.find(p => p.key === key)
  if (!plan || !catalog) return []
  const highlights = plan.highlights ?? []
  if (key === 'free') {
    const trial = catalogTrial(catalog)
    const own = highlights.filter(h => !/\bteste\b/i.test(h))
    return trial
      ? [...own.slice(0, LINES_PER_PLAN - 1), `Teste de ${trial.days} dias da IA no primeiro material, sem cartão`]
      : own.slice(0, LINES_PER_PLAN)
  }
  const benefits = PAID_BENEFITS
    .filter(k => plan.limits[k] !== 0 && catalog.features[k]?.pro_benefit)
    .map(k => k === 'pdf_to_note' ? pdfBenefit(catalog, plan) : catalog.features[k]!.pro_benefit)
  const lines = [...highlights.slice(0, 2), ...benefits]
  for (const h of highlights.slice(2)) if (lines.length < LINES_PER_PLAN && !lines.includes(h)) lines.push(h)
  return lines.slice(0, LINES_PER_PLAN)
}

/**
 * The PDF line of the paid plan with its monthly page cap, when the cap is below "N PDFs × pages each"
 * (20 × 500 > 4.000): "20 PDFs por mês, até 500 páginas cada (4.000 páginas no mês)".
 */
function pdfBenefit(catalog: PlanCatalog, plan: PlanCatalog['plans'][number]): string {
  const text = catalog.features.pdf_to_note!.pro_benefit
  const cap = plan.extras?.pdf_pages_monthly_cap
  const count = plan.limits.pdf_to_note
  const each = plan.extras?.pdf_pages_per_note
  const capped = cap && (count === null || count === undefined || !each || count * each > cap)
  return capped ? `${text} (${cap.toLocaleString('pt-BR')} páginas no mês)` : text
}

/**
 * The line under a call that sells the AI (PDF, cards from text or photo, questões): the Free plan has no AI, so it
 * says where it is. With `pdf`, the trial's page cap too. Only from the catalog.
 */
export function landingAiLine(catalog: PlanCatalog | null, opts: { pdf?: boolean } = {}): string {
  const name = paidPlanName(catalog)
  const trial = catalogTrial(catalog)
  // The Free's preview of the AI in place of the trial (prd-uso-justo §9)
  if (!trial && catalog?.preview) return `Experimente na prévia grátis. A IA fica no ${name}.`
  if (!trial) return `A IA faz parte do ${name}.`
  return opts.pdf && trial.pdf_pages_cap
    ? `A IA está no teste grátis, com até ${trial.pdf_pages_cap} páginas de PDF, e no ${name}.`
    : `A IA está no teste grátis e no ${name}.`
}

/** What the trial leaves out, said once: "O podcast fica só no Intensivo." */
function trialExcludesText(catalog: PlanCatalog | null, trial: CatalogTrial): string {
  return trial.excludes?.includes('podcast') ? ` O podcast fica só no ${paidPlanName(catalog)}.` : ''
}

/**
 * The trial's conditions under the plan cards: when it starts, the verified e-mail, once per account, the quotas of
 * the catalog (trialLimitsText, the same of /planos) and what it leaves out. Empty without a trial.
 */
export function landingTrialTerms(catalog: PlanCatalog | null): string {
  const trial = catalogTrial(catalog)
  // The preview's sentence comes whole from the API (prd-uso-justo §9)
  if (!trial && catalog?.preview) return `${catalog.preview.text} Pede o e-mail confirmado.`
  if (!trial) return ''
  const limits = trialLimitsText(catalog)
  return `O teste de ${trial.days} dias começa no primeiro material, pede o e-mail confirmado e vale uma vez por conta.`
    + (limits ? ` Inclui ${limits}.` : '')
    + trialExcludesText(catalog, trial)
}

/** Under "Revisar é de graça. Pra sempre.". */
export function landingPlansLead(catalog: PlanCatalog | null): string {
  const name = paidPlanName(catalog)
  const trial = catalogTrial(catalog)
  if (!trial && catalog?.preview) return `A IA você experimenta na prévia grátis, uma vez por conta. No ${name}, ela acompanha você até a prova.`
  return trial
    ? `A IA você testa por ${trial.days} dias, sem cartão, a partir do primeiro material. No ${name}, ela acompanha você até a prova.`
    : `A IA faz parte do ${name}, que acompanha você até a prova.`
}

/** The plan line of the podcast section: the paid plan's benefit and whether the trial leaves it out. */
export function landingPodcastLine(catalog: PlanCatalog | null): string {
  const name = paidPlanName(catalog)
  const feature = catalog?.features?.podcast
  const trial = catalogTrial(catalog)
  // The benefit may already say the period ("8 episódios por mês, de até 8 min", prd-uso-justo RF-B2)
  const benefit = feature?.pro_benefit
  const unit = benefit && feature?.unit && !benefit.includes(feature.unit) ? ` ${feature.unit}` : ''
  const own = benefit ? `No ${name}: ${benefit.charAt(0).toLowerCase()}${benefit.slice(1)}${unit}.` : `Os episódios fazem parte do ${name}.`
  const previewSeconds = !trial && (catalog?.preview?.limits?.podcast ?? 0) > 0 ? catalog?.preview?.podcast_seconds : null
  if (previewSeconds) return `${own} No Grátis, uma prévia de ${previewSeconds} s.`
  return trial?.excludes?.includes('podcast') ? `${own} O teste de ${trial.days} dias não inclui o podcast.` : own
}

/**
 * Under the player: the sample is a cut of an episode. Its length comes from SAMPLE, the episode's cap and the plan's
 * name from the catalog: "Amostra de 29 s de um episódio de até 8 min do Intensivo."
 */
export function landingSampleLine(catalog: PlanCatalog | null, seconds: number = SAMPLE.duration): string {
  const cut = `Amostra de ${Math.round(seconds)} s de um episódio`
  const minutes = catalog?.plans?.find(p => p.key === 'pro')?.extras?.podcast_max_minutes
  return minutes ? `${cut} de até ${minutes} min do ${paidPlanName(catalog)}.` : `${cut} do ${paidPlanName(catalog)}.`
}

export function landingFaqs(catalog: PlanCatalog | null): { q: string, a: string }[] {
  const name = paidPlanName(catalog)
  const trial = catalogTrial(catalog)
  const free = 'É. Criar e revisar cards, organizar cadernos e importar do Anki não têm prazo nem pedem cartão.'
  return [
    {
      q: 'É grátis mesmo?',
      a: trial
        ? `${free} Ao mandar o primeiro material, com o e-mail confirmado, você ganha ${trial.days} dias para testar a IA${trialLimitsText(catalog) ? `: ${trialLimitsText(catalog)}` : ''}.${trialExcludesText(catalog, trial)} Depois, a conta volta ao Grátis, sem cobrança.`
        : catalog?.preview
          ? `${free} ${catalog.preview.text} Depois, a IA fica no ${name}.`
          : `${free} A IA faz parte do ${name}.`,
    },
    {
      q: 'Serve para o meu concurso?',
      a: 'Serve para qualquer prova. Não é um banco de cards de outra pessoa: os cards saem do seu material, do seu edital, da apostila ou da lei seca que você manda. A questão que você errou também vira card.',
    },
    {
      q: 'Tem cupom de desconto?',
      a: `Não precisa de cupom: o preço é o mesmo para todo mundo, e revisar continua grátis. No ${name}, o anual sai mais barato que o mensal e tem desconto no Pix.`,
    },
    {
      q: 'Abre no computador?',
      a: 'Abre. É o mesmo Baigi no navegador do computador e do celular, com tudo sincronizado. No celular, dá para instalar na tela inicial como um app.',
    },
    {
      q: 'Como vocês sabem quanto eu vou lembrar?',
      a: 'Cada card tem uma força que sobe quando você acerta e cai com o tempo. A conta soma a força de todos os seus cards no dia da prova. Ela aparece com a prova marcada, a partir de 20 cards da prova, com pelo menos 10 já revisados e firmes.',
    },
    {
      q: 'Já uso o Anki. Começo do zero?',
      a: 'Não. O Baigi traz os cards com o intervalo e o número de erros de cada um; o histórico de revisões fica no Anki. No Anki, use Arquivo → Exportar → Pacote de baralho (.apkg).',
    },
    {
      q: `Como cancelo o ${name}?`,
      a: 'O mensal você cancela quando quiser, em dois cliques. O anual é pago uma vez e não renova sozinho. Seus cadernos e cards continuam no Grátis.',
    },
    { q: 'A IA pode errar?', a: 'Pode. Por isso cada card mostra de onde saiu, e você edita na hora.' },
  ]
}

// ── Where each call is, for landing_cta_clicked (prd-landing-d RF-D18) ──

export type { LandingCtaPosition } from '~/types/analytics'

/** The page's tracker, given to every LandingCta (provide/inject). */
export const LANDING_CTA: InjectionKey<(position: LandingCtaPosition, area?: LandingArea) => void> = Symbol('landing-cta')
