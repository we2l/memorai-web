// Colors of the notebook picker: the value is what the API stores; the tone comes from utils/subjects.ts (--subject-1..8)
export const NOTEBOOK_COLORS = [
  { value: 'purple', label: 'Roxo' },
  { value: 'blue', label: 'Azul' },
  { value: 'green', label: 'Verde' },
  { value: 'orange', label: 'Laranja' },
  { value: 'red', label: 'Vermelho' },
  { value: 'pink', label: 'Rosa' },
  { value: 'yellow', label: 'Amarelo' },
  { value: 'gray', label: 'Cinza' },
] as const

export type NotebookColorValue = (typeof NOTEBOOK_COLORS)[number]['value']
