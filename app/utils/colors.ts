export const NOTEBOOK_COLORS = [
  { value: 'purple', hex: '#6F3FF5', label: 'Roxo' },
  { value: 'blue', hex: '#2563EB', label: 'Azul' },
  { value: 'green', hex: '#16A34A', label: 'Verde' },
  { value: 'orange', hex: '#EA580C', label: 'Laranja' },
  { value: 'red', hex: '#DC2626', label: 'Vermelho' },
  { value: 'pink', hex: '#DB2777', label: 'Rosa' },
  { value: 'yellow', hex: '#CA8A04', label: 'Amarelo' },
  { value: 'gray', hex: '#6B7280', label: 'Cinza' },
] as const

export type NotebookColorValue = (typeof NOTEBOOK_COLORS)[number]['value']

export function getColorHex(value: string | null | undefined): string {
  const color = NOTEBOOK_COLORS.find((c) => c.value === value)
  return color?.hex ?? '#6B7280'
}
