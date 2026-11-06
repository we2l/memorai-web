import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Reads app/assets/css/tokens.css (DS v3, ADR-027) and resolves every semantic token to its hex, per theme:
// :root is the light theme; .dark is :root plus its own declarations (the cascade on <html>).
export const TOKENS_FILE = resolve(__dirname, '../../app/assets/css/tokens.css')

export type Theme = 'light' | 'dark'
type Decls = Record<string, string>

export function parseTokens(css: string): Record<Theme, Decls> {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const light: Decls = {}
  const dark: Decls = {}
  for (const block of text.matchAll(/(:root|\.dark)\s*\{([^{}]*)\}/g)) {
    const target = block[1] === '.dark' ? dark : light
    for (const d of block[2].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) target[d[1]!] = d[2]!.trim()
  }
  return { light, dark: { ...light, ...dark } }
}

/** Follows var(--x) until a hex; null for anything else (shadows, color-mix, sizes). */
export function resolveHex(decls: Decls, name: string): string | null {
  let value = decls[name]
  for (let hops = 0; value && hops < 10; hops++) {
    const ref = value.match(/^var\((--[\w-]+)\)$/)
    if (!ref) break
    value = decls[ref[1]!]
  }
  return value && /^#[0-9a-f]{6}$/i.test(value) ? value.toUpperCase() : null
}

export function readTokens() {
  return parseTokens(readFileSync(TOKENS_FILE, 'utf8'))
}

/** WCAG 2 relative luminance and contrast ratio. */
function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
}

export function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi! + 0.05) / (lo! + 0.05)
}
