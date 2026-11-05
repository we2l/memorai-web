/**
 * What the content step shows of the sample of each mode (prd-4g-conta-onboarding-v3 RF-F5): the real title and
 * first card of memorai-api/resources/onboarding/{mode}.json. The material itself lives on the API
 * (POST /onboarding/sample), and technical/professional use the general one there too.
 */
export interface SamplePreview {
  title: string
  front: string
  back: string
}

const GENERAL: SamplePreview = {
  title: 'Curva do esquecimento e repetição espaçada',
  front: 'O que mostra a curva do esquecimento de Ebbinghaus?',
  back: 'Que o esquecimento é rápido logo depois de aprender e fica cada vez mais lento com o tempo.',
}

const BY_MODE: Record<string, SamplePreview> = {
  exam: {
    title: 'Princípios fundamentais da Constituição',
    front: 'Quais são os 5 fundamentos da República Federativa do Brasil (art. 1º da CF)?',
    back: 'Soberania, cidadania, dignidade da pessoa humana, valores sociais do trabalho e da livre iniciativa e pluralismo político.',
  },
  academic: {
    title: 'Potencial de ação: como o neurônio dispara',
    front: 'Qual é o valor aproximado do potencial de repouso de um neurônio?',
    back: 'Cerca de −70 mV (interior negativo em relação ao exterior).',
  },
  language: {
    title: '8 phrasal verbs do dia a dia',
    front: 'give up',
    back: 'Desistir; parar de fazer algo. She gave up smoking last year.',
  },
}

export function samplePreview(mode: string): SamplePreview {
  return BY_MODE[mode] ?? GENERAL
}

/** The mode the sample is asked with: every mode the API knows, "Outro" (or none) = general. */
export function sampleMode(mode: string): string {
  return mode || 'general'
}
