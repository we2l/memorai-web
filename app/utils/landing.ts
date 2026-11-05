import type { CatalogTrial, PlanCatalog } from '~/types'

/**
 * Copy and data of the landing v4 (prd-landing-v4). Every sentence here is something the product does today
 * (PRD §5.1); prices and limits never: they come from GET /api/plans (PlanCards, catalogTrial).
 */

/** `?m=` of the short video that brought the visitor (RF-L11); anything else is the default message. */
export const LANDING_MESSAGES = ['prova', 'esqueci', 'faculdade', 'ingles'] as const
export type LandingMessage = typeof LANDING_MESSAGES[number] | 'padrao'

export function landingMessageOf(raw: unknown): LandingMessage {
  return typeof raw === 'string' && (LANDING_MESSAGES as readonly string[]).includes(raw) ? raw as LandingMessage : 'padrao'
}

/**
 * Runs in the <head> of the prerendered page, before the first paint: the variant of `?m=` is picked by CSS
 * (landing.css, html[data-m]), so there is no flash, no layout shift and no hydration mismatch.
 */
export const LANDING_MESSAGE_SCRIPT = `(function(){try{window.__baigiLandingQuery=location.search;var m=new URLSearchParams(location.search).get('m');if(${JSON.stringify(LANDING_MESSAGES)}.indexOf(m)>=0)document.documentElement.setAttribute('data-m',m)}catch(e){window.__baigiLandingQuery=''}})()`

/**
 * The query of the first load, kept by LANDING_MESSAGE_SCRIPT: Nuxt takes the query out of the address while it
 * hydrates a prerendered page, so `location.search` in onMounted can come back empty.
 */
export function landingQuery(): URLSearchParams {
  const kept = (window as unknown as { __baigiLandingQuery?: string }).__baigiLandingQuery
  return new URLSearchParams(kept ?? window.location.search)
}

/** Real screens of the app (e2e/landing/shots.ts): 390 CSS px wide, captured at 2x. */
export const SHOTS = {
  hoje: { height: 640, alt: 'Tela Hoje de uma conta de demonstração do Baigi: a meta do dia em lotes, a prova marcada com a projeção e o plano do dia com os cards a revisar.' },
  projecao: { height: 268, alt: 'Prova marcada numa conta de demonstração do Baigi: TRF 4ª Região em 45 dias, com a projeção de quanto lembrar mantendo o ritmo e se parar hoje.' },
  dominio: { height: 176, alt: 'Desempenho por matéria numa conta de demonstração do Baigi: o domínio e o acerto nas questões de Direito Administrativo e de Direito Constitucional.' },
  revisao: { height: 472, alt: 'Revisão no Baigi, conta de demonstração: lote 1 de 2, um card de Direito Constitucional virado e a origem dele, a parte e a página da apostila em PDF.' },
  material: { height: 392, alt: 'Material no Baigi, conta de demonstração: a parte 5 de 6 de uma apostila em PDF, com as páginas de cada trecho.' },
  simulado: { height: 430, alt: 'Resultado de um simulado no Baigi, conta de demonstração: 7 de 10 questões certas e o acerto em cada assunto, comparado com o histórico.' },
  ingles: { height: 320, alt: 'Revisão de inglês no Baigi, conta de demonstração: o card “I’m looking forward to it” com a tradução.' },
  anatomia: { height: 320, alt: 'Revisão de Anatomia no Baigi, conta de demonstração: o card sobre o principal músculo da inspiração, com a resposta.' },
  oab: { height: 320, alt: 'Revisão para a OAB no Baigi, conta de demonstração: o card sobre o prazo da contestação no CPC, com a resposta.' },
  enem: { height: 340, alt: 'Revisão para o ENEM no Baigi, conta de demonstração: o card sobre a 1ª Lei de Mendel, com a resposta.' },
} as const
export type ShotName = keyof typeof SHOTS

/** The `<h1>` of a variant: the key words get the lilac highlighter (`mark`). */
export interface HeroVariant { key: LandingMessage, title: [before: string, mark: string, after: string], lead: string, shot: ShotName }

export const HERO_VARIANTS: HeroVariant[] = [
  {
    key: 'padrao',
    title: ['Saiba quanto você vai lembrar ', 'no dia da prova', '.'],
    lead: 'Mande seu PDF ou suas anotações. O Baigi cria os cards, diz o que revisar a cada dia e mostra quanto você domina de cada assunto.',
    shot: 'hoje',
  },
  {
    key: 'prova',
    title: ['Prova marcada? Saiba ', 'o que revisar hoje', '.'],
    lead: 'Marque a data. O Baigi monta o plano de cada dia e estima quanto você vai lembrar na prova: mantendo o ritmo e se parar hoje.',
    shot: 'projecao',
  },
  {
    key: 'esqueci',
    title: ['Você não esquece por falta de esforço. Esquece por ', 'falta de revisão', '.'],
    lead: 'Mande o que você estudou. O Baigi cria os cards e traz cada um de volta perto da hora de esquecer.',
    shot: 'revisao',
  },
  {
    key: 'faculdade',
    title: ['Os slides da aula viram ', 'revisão até a prova', '.'],
    lead: 'Mande o PDF da matéria, de Anatomia a Cálculo. O Baigi escreve a nota em partes, cria os cards e diz o que revisar a cada dia.',
    shot: 'anatomia',
  },
  {
    key: 'ingles',
    title: ['Vocabulário que fica: ', 'cada palavra volta na hora certa', '.'],
    lead: 'Crie cards de palavras e frases, por texto ou foto, ou traga seus baralhos do Anki sem recomeçar do zero. O Baigi diz o que revisar a cada dia.',
    shot: 'ingles',
  },
]

/** The areas, in one line under the hero (each gets its own card further down). */
export const AUDIENCE_LINE = 'Para concurso, OAB, ENEM, faculdade, medicina e idiomas.'

/**
 * Around the app in the hero (as Knowt annotates its phone): what the screen proves. The first one carries the
 * numbers of the demo account (demo.json, written by the capture); the others name a mode by its icon.
 */
export const ANNOTATIONS = [
  { key: 'review', title: 'O que revisar hoje', text: 'Quantos cards revisar hoje, em lotes de 20.', icon: 'review' },
  { key: 'origin', title: 'De onde veio o card', text: 'Card feito de PDF abre a página de onde saiu.', icon: 'origin' },
  { key: 'errors', title: 'Seus erros viram revisão', text: 'As questões erradas do simulado voltam como cards.', icon: 'quiz' },
] as const

/** ✓ under the hero actions: the trial only when the catalog offers it; the free core is the owner's decision (05/11). */
export function landingGuarantees(trial: CatalogTrial | null): string[] {
  return ['Sem cartão', ...(trial ? [`${trial.days} dias de Pro`] : []), 'Revisão grátis para sempre']
}

/** "Isso soa familiar?": what students write every week in study forums (research rodada 2 §4), paraphrased. */
export const PAINS = [
  {
    pain: 'Entendo a matéria e, uma semana depois, esqueci quase tudo.',
    answer: 'O Baigi agenda cada card para voltar perto da hora em que você ia esquecer: é a repetição espaçada. Você só abre e revisa.',
  },
  {
    pain: 'Criar card dá tanta preguiça que eu desisto antes de começar.',
    answer: 'Mande o PDF, o texto ou uma foto: os cards saem prontos, e os do PDF ficam ligados à página de onde vieram. Você edita o que quiser.',
  },
  {
    pain: 'Parei uns dias e a revisão virou uma montanha.',
    answer: 'A revisão vem em lotes de 20, com fim. Se atrasar, o modo recuperação mostra só os 20 mais urgentes de cada vez.',
  },
]

export const STEPS: { title: string, text: string, shot: ShotName }[] = [
  {
    title: 'Mande o material',
    text: 'O PDF vira uma nota dividida em partes, com a página de cada trecho, e os cards saem dela. Também vale texto, foto ou um baralho do Anki.',
    shot: 'material',
  },
  {
    title: 'Revise o que vence hoje',
    text: 'Você vê quantos cards revisar hoje e faz em lotes de 20. Depois de virar o card, vê de onde ele veio e abre o trecho com um toque.',
    shot: 'revisao',
  },
  {
    title: 'Treine com questões: seus erros viram revisão',
    text: 'No resultado do simulado, você vê o acerto de cada assunto. Com um toque, as questões que errou viram cards e voltam na revisão.',
    shot: 'simulado',
  },
]

/** "Como o Baigi sabe": what the two numbers of the promise mean, and when they show up (prd-landing-v4 RF-L3c). */
export const PROJECTION = [
  { term: 'Mantendo o ritmo', text: 'Quanto você deve lembrar no dia da prova se revisar o que vencer até lá.' },
  { term: 'Se parar hoje', text: 'Quanto sobra se você não revisar mais nada. A distância entre os dois é o que a revisão está segurando.' },
  { term: 'Domínio de cada matéria', text: 'Quantos cards dela estão em dia, ao lado do acerto nas questões: você sabe onde treinar.' },
]

/** The gallery of areas (prd-landing-v4 RF-L4, Hubink's gallery): a real review screen and a sentence each. */
export const SEGMENTS = [
  {
    name: 'Concurso',
    text: 'Edital grande e prova com data. Cada matéria mostra o domínio e o acerto, e a projeção mostra quanto você deve lembrar no dia.',
    dot: 'bg-subject-1',
    shot: 'dominio',
    featured: true,
  },
  {
    name: 'Medicina e faculdade',
    text: 'Mande os slides ou a apostila: o PDF vira nota em partes, e cada card leva de volta à página de onde saiu.',
    dot: 'bg-subject-5',
    shot: 'anatomia',
    featured: false,
  },
  {
    name: 'ENEM e vestibular',
    text: 'Fórmulas, datas e conceitos das quatro áreas, com a revisão do dia pelo celular.',
    dot: 'bg-subject-3',
    shot: 'enem',
    featured: false,
  },
  {
    name: 'OAB',
    text: 'Prazos, artigos e súmulas em cards curtos, e o simulado mostra onde você mais erra.',
    dot: 'bg-subject-4',
    shot: 'oab',
    featured: false,
  },
  {
    name: 'Idiomas',
    text: 'Palavras e frases por texto ou foto. Do Anki, os baralhos chegam com o intervalo e os erros de cada card.',
    dot: 'bg-subject-2',
    shot: 'ingles',
    featured: false,
  },
] as const satisfies readonly { name: string, text: string, dot: string, shot: ShotName, featured: boolean }[]

/** The trial of the catalog (root or the Pro plan), only when it needs no card. */
export function catalogTrial(catalog: PlanCatalog | null): CatalogTrial | null {
  const trial = catalog?.trial ?? catalog?.plans?.find(p => p.key === 'pro')?.trial ?? null
  return trial && trial.days > 0 && !trial.card_required ? trial : null
}

export function landingFaqs(trial: CatalogTrial | null) {
  const free = 'Sim. Criar a conta não pede cartão, e revisar, organizar cadernos, criar seus cards e importar do Anki não têm prazo.'
  return [
    {
      q: 'É grátis mesmo?',
      a: trial
        ? `${free} Ao mandar o primeiro material, você ganha ${trial.days} dias do Pro; depois, a conta volta ao plano grátis sem cobrança. Os limites de cada plano estão logo acima.`
        : `${free} O que usa IA tem os limites que você vê nos planos, logo acima.`,
    },
    {
      q: 'Qual a diferença para o ChatGPT ou o NotebookLM?',
      a: 'Eles geram resumos e perguntas quando você pede. O Baigi guarda os cards, decide o que você revisa a cada dia, mostra o domínio e o acerto de cada assunto e estima quanto você vai lembrar na prova.',
    },
    {
      q: 'Funciona no celular?',
      a: 'Sim, pelo navegador do celular ou do computador, com os mesmos dados nos dois. Dá para instalar na tela inicial como um app. Precisa de internet.',
    },
    {
      q: 'Já uso o Anki. Perco meu progresso?',
      a: 'Não recomeça do zero: o arquivo .apkg traz os cards, a mídia e o ponto em que cada um estava (intervalo, repetições e erros). O registro de cada revisão antiga fica no Anki.',
    },
    {
      q: 'A IA pode errar?',
      a: 'Pode. Por isso cada card mostra de onde veio (a página, quando sai de um PDF), e você edita ou apaga o que quiser. Em assunto em que um erro custa caro, confira os cards com o material.',
    },
    {
      q: 'Como cancelo o Pro?',
      a: 'O mensal você cancela quando quiser, pelo portal de assinatura. O anual é pago uma vez por ano, sem renovação automática. Se sair do Pro, seus cadernos e cards continuam na conta grátis.',
    },
    {
      q: 'Meus dados ficam seguros?',
      a: 'Seus cadernos ficam só na sua conta, que é protegida por senha ou pelo login do Google, com conexão segura (HTTPS). Nas configurações, você exporta seus dados ou apaga a conta quando quiser.',
    },
  ]
}
