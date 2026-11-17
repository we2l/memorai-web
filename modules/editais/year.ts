/** The year of the edital from its slug {orgao}-{ano}-{cargo} (R5.6). No imports: the app uses it too. */
const SLUG_YEAR = /-(\d{4})(?:-|$)/

export function editalYear(slug: string): string | null {
  return SLUG_YEAR.exec(slug)?.[1] ?? null
}
