// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'
import { PUBLIC_DIR, skipWithoutBuild } from './buildOutput'

const PAGES = ['index.html', 'entrar/index.html', 'criar-conta/index.html', 'termos/index.html', 'privacidade/index.html', 'planos/index.html', 'ajuda/index.html']
const MANIFEST = resolve(__dirname, '../../node_modules/.cache/nuxt/.nuxt/dist/server/client.manifest.mjs')

describe.skipIf(skipWithoutBuild)('páginas pré-renderizadas (build)', () => {
  it.each(PAGES)('%s existe e não tem dado de usuário nem preço fixo', (page) => {
    const file = join(PUBLIC_DIR, page)
    expect(existsSync(file)).toBe(true)
    const html = readFileSync(file, 'utf8')
    // Prices come from GET /api/plans on the client (RN-F01)
    expect(html).not.toMatch(/R\$\s?\d/)
    // No user e-mail in the static HTML (company contact and input placeholder are fine)
    const emails = [...html.matchAll(/[\w.+-]+@[\w-]+\.[\w.]+/g)].map(m => m[0])
    expect(emails.filter(e => !e.endsWith('@baigi.com.br') && e !== 'seu@email.com')).toEqual([])
  })

  it('landing não pré-carrega o chunk do MockGraph (d3)', async () => {
    const manifest = (await import(pathToFileURL(MANIFEST).href)).default
    const key = Object.keys(manifest).find(k => k.endsWith('components/landing/MockGraph.vue'))
    expect(key).toBeDefined()
    const chunk = manifest[key!].file as string
    const html = readFileSync(join(PUBLIC_DIR, 'index.html'), 'utf8')
    const preloads = [...html.matchAll(/<link[^>]+rel="modulepreload"[^>]*>/g)].map(m => m[0])
    expect(preloads.some(l => l.includes(chunk))).toBe(false)
  })
})
