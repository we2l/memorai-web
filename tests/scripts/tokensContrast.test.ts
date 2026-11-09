// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { contrast, readTokens, resolveHex, type Theme } from './tokensFile'

// Contrast of the DS v3 tokens (prd-ds-v3-fundacao RF-1.3, ADR-027 §2) in the E2 skin (ADR-035 §7), both themes.
// A value that fails here is adjusted in tokens.css and the final table goes to ADR-035 §7.
// - text: 4.5:1 (WCAG 1.4.3); field border, focus ring, icons and dots that carry meaning: 3:1 (1.4.11)
// - the conquest shapes (--celebrate/--streak) never inform alone (ADR-027 §4): their text pair is tested
const tokens = readTokens()
const THEMES: Theme[] = ['light', 'dark']

const SURFACES = ['--surface-page', '--surface-raised', '--surface-subtle', '--surface-soft', '--surface-tinted', '--surface-float']
const METRICS = ['streak', 'goal', 'accuracy']
const TEXT = ['--fg-strong', '--fg', '--fg-muted', '--action-fg']
const STATES = ['success', 'warning', 'danger', 'info']
const SUBJECTS = Array.from({ length: 8 }, (_, i) => `--subject-${i + 1}`)

interface Pair { fg: string, bg: string, min: number }

const pairs: Pair[] = [
  // Text on every surface
  ...TEXT.flatMap(fg => SURFACES.map(bg => ({ fg, bg, min: 4.5 }))),
  // Selected chip / badge of the action: text on --action-subtle
  ...['--fg-strong', '--fg', '--action-fg'].map(fg => ({ fg, bg: '--action-subtle', min: 4.5 })),
  // Text on the action fill, at rest and on hover
  { fg: '--on-action', bg: '--action', min: 4.5 },
  { fg: '--on-action', bg: '--action-hover', min: 4.5 },
  // The action fill and the focus ring stand out from the surfaces (non-text)
  ...['--action', '--focus-ring'].flatMap(fg => ['--surface-page', '--surface-raised', '--surface-subtle'].map(bg => ({ fg, bg, min: 3 }))),
  // Field border
  ...SURFACES.map(bg => ({ fg: '--line-input', bg, min: 3 })),
  // States: text on its own background and on the sections
  ...STATES.flatMap(s => [`--state-${s}-bg`, '--surface-raised', '--surface-page'].map(bg => ({ fg: `--state-${s}`, bg, min: 4.5 }))),
  // Conquest: the text that goes with the shape
  ...['--celebrate-fg', '--streak-fg'].flatMap(fg => ['--surface-page', '--surface-raised', '--surface-subtle', '--surface-tinted'].map(bg => ({ fg, bg, min: 4.5 }))),
  // Practice icons in their neutral square and on the sections
  ...['quiz', 'listen'].flatMap(m => [`--practice-${m}-bg`, '--surface-raised', '--surface-page'].map(bg => ({ fg: `--practice-${m}`, bg, min: 3 }))),
  // Subject dots next to the name
  ...SUBJECTS.flatMap(fg => ['--surface-raised', '--surface-page', '--surface-subtle'].map(bg => ({ fg, bg, min: 3 }))),
  // E2 (ADR-035 §7): the chip text of a metric on its tile, and the icon (non-text) on the tile and on the card
  ...METRICS.map(m => ({ fg: `--metric-${m}-fg`, bg: `--metric-${m}-bg`, min: 4.5 })),
  ...METRICS.flatMap(m => [`--metric-${m}-bg`, '--surface-raised'].map(bg => ({ fg: `--metric-${m}`, bg, min: 3 }))),
  // The feedback band of the review: its text on it, the "Continuar" fill on it, and the ink on the fill
  ...['ok', 'again'].flatMap(k => [
    { fg: `--fb-${k}-fg`, bg: `--fb-${k}-bg`, min: 7 },
    { fg: `--fb-${k}-strong`, bg: `--fb-${k}-bg`, min: 2 },
    { fg: `--fb-${k}-ink`, bg: `--fb-${k}-strong`, min: 4.5 },
  ]),
  // The selected item of the shell (pill on --action-subtle) and the field border on the soft tile
  { fg: '--action-fg', bg: '--action-subtle', min: 4.5 },
  { fg: '--line-input', bg: '--surface-soft', min: 3 },
]

describe('tokens.css: cada semântico de cor resolve para um hex nos dois temas', () => {
  const names = [...new Set(pairs.flatMap(p => [p.fg, p.bg]))]
  for (const theme of THEMES) {
    it(theme, () => {
      const missing = names.filter(n => !resolveHex(tokens[theme], n))
      expect(missing).toEqual([])
    })
  }
})

describe('tokens.css: contraste dos pares (WCAG 2)', () => {
  for (const theme of THEMES) {
    it(`tema ${theme === 'light' ? 'claro' : 'escuro'}`, () => {
      const failures = pairs.flatMap(({ fg, bg, min }) => {
        const a = resolveHex(tokens[theme], fg)
        const b = resolveHex(tokens[theme], bg)
        if (!a || !b) return [`${fg} sobre ${bg}: sem valor`]
        const ratio = contrast(a, b)
        return ratio + 1e-9 >= min ? [] : [`${fg} ${a} sobre ${bg} ${b}: ${ratio.toFixed(2)} < ${min}`]
      })
      expect(failures).toEqual([])
    })
  }

  it('a fórmula bate com valores conhecidos', () => {
    expect(contrast('#FFFFFF', '#000000')).toBeCloseTo(21, 5)
    expect(contrast('#6F3FF5', '#FFFFFF')).toBeCloseTo(5.67, 2)
  })
})

describe('tokens.css: regras do ADR-027 e do ADR-035', () => {
  it('página branca pura no claro e um degrau abaixo do cartão no escuro (ADR-035 §7)', () => {
    expect(resolveHex(tokens.light, '--surface-page')).toBe('#FFFFFF')
    expect(resolveHex(tokens.dark, '--surface-page')).toBe('#0F0D14')
    expect(resolveHex(tokens.dark, '--surface-raised')).toBe('#19161F')
  })

  it('os ponteiros v3 seguem as métricas: o amarelo de conquista saiu (ADR-035 §7)', () => {
    for (const theme of THEMES) {
      expect(resolveHex(tokens[theme], '--celebrate'), theme).toBe(resolveHex(tokens[theme], '--metric-goal'))
      expect(resolveHex(tokens[theme], '--streak'), theme).toBe(resolveHex(tokens[theme], '--metric-streak'))
    }
  })

  it('nenhum token cru com prefixo de namespace do Tailwind (§1)', () => {
    const all = Object.keys({ ...tokens.light, ...tokens.dark })
    expect(all.filter(n => /^--(color|text|font|radius|shadow|spacing|leading|tracking|ease|animate|container|blur)-/.test(n))).toEqual([])
  })
})
