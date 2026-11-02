// @vitest-environment node
import { readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PUBLIC_DIR, skipWithoutBuild } from './buildOutput'
import { readTokens, resolveHex } from './tokensFile'

// The manifest and the theme-color metas carry the page color as a literal (nuxt.config.ts THEME_COLOR):
// it must stay equal to --surface-page of tokens.css (DS v3, prd-ds-v3-fundacao RF-1.6)
const tokens = readTokens()
const page = { light: resolveHex(tokens.light, '--surface-page'), dark: resolveHex(tokens.dark, '--surface-page') }

describe.skipIf(skipWithoutBuild)('manifest do PWA (build)', () => {
  it('abre em /hoje com a cor de página do tema claro', () => {
    const manifest = JSON.parse(readFileSync(join(PUBLIC_DIR, 'manifest.webmanifest'), 'utf8'))
    expect(manifest.start_url).toBe('/hoje')
    expect(page.light).toBeTruthy()
    expect(manifest.theme_color.toUpperCase()).toBe(page.light)
    expect(manifest.background_color.toUpperCase()).toBe(page.light)
  })

  it('metas theme-color claro e escuro com a cor de página de cada tema', () => {
    const html = readFileSync(join(PUBLIC_DIR, 'entrar/index.html'), 'utf8')
    const metas = [...html.matchAll(/<meta name="theme-color" content="([^"]+)" media="\(prefers-color-scheme: (light|dark)\)">/g)]
    expect(Object.fromEntries(metas.map(m => [m[2], m[1]!.toUpperCase()]))).toEqual(page)
  })

  it('script de tema no <head>, antes do CSS (sem piscar)', () => {
    const html = readFileSync(join(PUBLIC_DIR, 'entrar/index.html'), 'utf8')
    const script = html.indexOf("localStorage.getItem('color-mode')")
    expect(script).toBeGreaterThan(0)
    expect(script).toBeLessThan(html.indexOf('rel="stylesheet"'))
    expect(script).toBeLessThan(html.indexOf('<body'))
  })

  it('ícone 512 otimizado (≤ 40 KB)', () => {
    expect(statSync(join(PUBLIC_DIR, 'pwa-512x512.png')).size).toBeLessThanOrEqual(40 * 1024)
  })
})
