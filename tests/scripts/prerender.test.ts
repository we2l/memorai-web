// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PUBLIC_DIR, skipWithoutBuild } from './buildOutput'

const PAGES = ['index.html', 'entrar/index.html', 'criar-conta/index.html', 'termos/index.html', 'privacidade/index.html', 'planos/index.html', 'ajuda/index.html']

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

  // Landing v4 (prd-landing-v4 RF-L11): every ?m= variant is in the static HTML, and the <head> script picks one
  // before the first paint (no flash, no layout shift)
  it('landing traz as variantes do ?m= e o script que escolhe antes da pintura', () => {
    const html = readFileSync(join(PUBLIC_DIR, 'index.html'), 'utf8')
    for (const m of ['padrao', 'prova', 'esqueci', 'faculdade', 'ingles']) expect(html, m).toContain(`data-m-variant="${m}"`)
    const head = html.slice(0, html.indexOf('</head>'))
    expect(head).toContain("setAttribute('data-m',m)")
    expect(html).not.toContain('markmap')
  })
})
