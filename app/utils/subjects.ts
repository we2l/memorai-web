// Subject colors of the DS v3 (ADR-027 §2): 8 tones (--subject-1..8), shown only as a small dot
// (UiSubjectMark). A notebook keeps its picker value (utils/colors.ts: 'purple', 'blue'...) or, in old
// data, a hex; both map to the nearest of the 8 tones. Without a color, a stable index picks one.
export type SubjectTone = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8

export const SUBJECT_TONE_COUNT = 8
const SLATE: SubjectTone = 8

/** Picker values (utils/colors.ts NOTEBOOK_COLORS) and common names → tone. Red has no tone of its own: orange is the nearest. */
const BY_NAME: Record<string, SubjectTone> = {
  purple: 1, violet: 1,
  blue: 2,
  green: 3,
  orange: 4, red: 4,
  pink: 5,
  teal: 6, cyan: 6, petrol: 6,
  yellow: 7, amber: 7,
  gray: 8, grey: 8, slate: 8,
}

/** Hue (degrees) of the light subject tones in tokens.css (--palette-subject-*); slate is the low-saturation one. */
const HUES: [SubjectTone, number][] = [[1, 263], [2, 217], [3, 165], [4, 17], [5, 335], [6, 193], [7, 36]]

/** Hue (0-360) and HSL saturation (0-1) of #rgb / #rrggbb; null when it is not a hex color. */
export function hueOf(hex: string): { hue: number; saturation: number } | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  const digits = m[1]!.length === 3 ? [...m[1]!].map(c => c + c).join('') : m[1]!
  const [r, g, b] = [0, 2, 4].map(i => Number.parseInt(digits.slice(i, i + 2), 16) / 255) as [number, number, number]
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  const light = (max + min) / 2
  const saturation = d === 0 ? 0 : d / (1 - Math.abs(2 * light - 1))
  if (d === 0) return { hue: 0, saturation: 0 }
  let hue = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  hue = (hue * 60 + 360) % 360
  return { hue, saturation }
}

const hueDistance = (a: number, b: number) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b))

/** Tone 1..8 for a notebook color (picker value or hex) or, without one, for a stable index. */
export function subjectTone(color?: string | null, index?: number): SubjectTone {
  if (color) {
    const named = BY_NAME[color.trim().toLowerCase()]
    if (named) return named
    const hsl = hueOf(color)
    if (hsl) {
      if (hsl.saturation < 0.2) return SLATE
      return HUES.reduce((best, [tone, hue]) => (hueDistance(hsl.hue, hue) < hueDistance(hsl.hue, best[1]) ? [tone, hue] : best), HUES[0]!)[0]
    }
  }
  if (index !== undefined && Number.isFinite(index)) {
    return ((((Math.trunc(index) % SUBJECT_TONE_COUNT) + SUBJECT_TONE_COUNT) % SUBJECT_TONE_COUNT) + 1) as SubjectTone
  }
  return SLATE
}
