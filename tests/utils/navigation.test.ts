import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { accountItems, activePlace, isNavActive, places, SETTINGS_ANCHORS } from '~/utils/navigation'

/** Every page of the app as a route path (pages/x/[id]/index.vue → /x/:id). */
function appRoutes(dir = join(process.cwd(), 'app/pages')): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) out.push(...appRoutes(full))
    else if (name.endsWith('.vue')) {
      const path = '/' + relative(join(process.cwd(), 'app/pages'), full).replace(/\.vue$/, '').replace(/(^|\/)index$/, '').replace(/\[(\w+)\]/g, ':$1')
      out.push(path === '/' ? '/' : path.replace(/\/$/, ''))
    }
  }
  return out
}

// The highlighted place of every route of the app (prd-navegacao-v3 §5): the section, not the exact path
const EXPECTED: Record<string, string | null> = {
  '/hoje': 'hoje',
  '/cadernos': 'cadernos',
  '/cadernos/:id': 'cadernos',
  '/cadernos/lixeira': 'cadernos',
  '/cadernos/:id/cards': 'cadernos',
  '/cadernos/:id/mapa': 'cadernos',
  '/cadernos/:id/material/:noteId': 'cadernos',
  '/importar': 'cadernos',
  '/praticar': 'praticar',
  '/revisar': 'praticar',
  '/simulados': 'praticar',
  '/simulados/:id': 'praticar',
  '/simulados/:id/resultado': 'praticar',
  '/podcasts': 'praticar',
  '/progresso': 'progresso',
  '/provas': 'progresso',
  '/provas/resultado': 'progresso',
  // Account, help and the public/auth pages: no place
  '/': null,
  '/_ds': null,
  '/ajuda': null,
  // The offline app shell (prd-revisao-offline RF-F1): never shown, it goes to /hoje
  '/app-shell': null,
  '/auth/google/callback': null,
  '/checkout': null,
  '/checkout/sucesso': null,
  '/comecar': null,
  '/comecar/:area': null,
  '/comecar/pronto': null,
  '/configuracoes': null,
  '/criar-conta': null,
  '/entrar': null,
  '/esqueci-senha': null,
  '/lembretes/desativado': null,
  '/planos': null,
  '/privacidade': null,
  '/redefinir-senha': null,
  '/termos': null,
  // Blog, free tools and "Quem faz" (prd-blog-seo): public pages, no place
  '/blog': null,
  '/blog/:slug': null,
  '/ferramentas': null,
  '/ferramentas/calculadora-do-esquecimento': null,
  '/ferramentas/plano-ate-a-prova': null,
  '/quem-faz': null,
}

describe('navigation: 4 lugares e o item ativo', () => {
  it('ordem fixa: Hoje · Cadernos · Praticar · Progresso, cada um com rota própria', () => {
    expect(places.map(p => p.label)).toEqual(['Hoje', 'Cadernos', 'Praticar', 'Progresso'])
    expect(places.map(p => p.to)).toEqual(['/hoje', '/cadernos', '/praticar', '/progresso'])
    for (const p of places) expect(p.sections).toContain(p.to)
  })

  it('toda rota do app tem o item ativo previsto (nenhuma página nova fica sem decisão)', () => {
    const routes = appRoutes().sort()
    expect(routes).toEqual(Object.keys(EXPECTED).sort())
    for (const route of routes) {
      const concrete = route.replace(':id', 'abc-123')
      expect(activePlace(concrete), route).toBe(EXPECTED[route])
    }
  })

  it('a seção conta, com query e hash fora; prefixo parecido não conta', () => {
    expect(activePlace('/revisar')).toBe('praticar')
    expect(activePlace('/provas')).toBe('progresso')
    expect(activePlace('/cadernosx')).toBeNull()
    expect(activePlace('/simuladosx')).toBeNull()
    expect(isNavActive('/cadernos/abc', '/cadernos')).toBe(true)
    expect(isNavActive('/cadernos', '/cadernos')).toBe(true)
    expect(isNavActive('/cadernosx', '/cadernos')).toBe(false)
  })

  it('cada lugar só tem uma seção sua (uma rota nunca acende dois itens)', () => {
    const all = places.flatMap(p => p.sections)
    expect(new Set(all).size).toBe(all.length)
  })
})

describe('navigation: menu da conta', () => {
  it('itens do RF-3 na ordem do protótipo, levando às âncoras de /configuracoes', () => {
    expect(accountItems.map(i => i.label)).toEqual([
      'Conta e segurança', 'Estudo e lembretes', 'Uso de IA no mês', 'Aparência', 'Exportar meus dados', 'Ajuda e atalhos', 'Sair',
    ])
    const anchors = accountItems.filter(i => i.to?.startsWith('/configuracoes#')).map(i => i.to!.split('#')[1])
    expect(anchors).toEqual(['conta', 'estudo', 'plano', 'dados'])
    for (const a of anchors) expect(SETTINGS_ANCHORS).toContain(a)
  })

  it('/configuracoes tem uma seção com cada âncora', () => {
    const page = readFileSync(join(process.cwd(), 'app/pages/configuracoes.vue'), 'utf8')
    for (const id of SETTINGS_ANCHORS) expect(page, id).toMatch(new RegExp(`<UiSection[^>]*\\sid="${id}"`))
  })
})
