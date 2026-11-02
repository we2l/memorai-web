/** Study modes of a caderno (`topics.learning_mode`, the root's mode rules the whole subtree). */
export const LEARNING_MODES = [
  { value: 'exam', label: 'Concurso', description: 'Leis, pegadinhas, questões' },
  { value: 'academic', label: 'Faculdade', description: 'Conceitos e exemplos' },
  { value: 'language', label: 'Idiomas', description: 'Frases e vocabulário' },
  { value: 'technical', label: 'Programação / TI', description: 'Código e fórmulas' },
  { value: 'professional', label: 'Certificação', description: 'Cenários práticos' },
  { value: 'general', label: 'Uso geral', description: 'Formato padrão' },
] as const

export type LearningMode = (typeof LEARNING_MODES)[number]['value']

export const TARGET_LANGUAGES = [
  { value: 'en', label: 'Inglês' },
  { value: 'es', label: 'Espanhol' },
  { value: 'fr', label: 'Francês' },
  { value: 'de', label: 'Alemão' },
  { value: 'it', label: 'Italiano' },
  { value: 'ja', label: 'Japonês' },
  { value: 'ko', label: 'Coreano' },
  { value: 'zh', label: 'Chinês' },
] as const

export const LANGUAGE_LEVELS = [
  { value: 'beginner', label: 'Iniciante' },
  { value: 'intermediate', label: 'Intermediário' },
  { value: 'advanced', label: 'Avançado' },
] as const

export function learningModeLabel(mode?: string | null): string | null {
  return LEARNING_MODES.find(m => m.value === mode)?.label ?? null
}
