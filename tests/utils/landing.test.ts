import { describe, it, expect } from 'vitest'
import { HERO_VARIANTS, SHOTS, LANDING_MESSAGES, LANDING_MESSAGE_SCRIPT, SEGMENTS, catalogTrial, landingFaqs, landingGuarantees, landingMessageOf } from '~/utils/landing'
import type { PlanCatalog } from '~/types'

const catalog = (over: Partial<PlanCatalog> = {}, proTrial?: object): PlanCatalog => ({
  currency: 'BRL',
  period: 'calendar_month',
  period_timezone: 'America/Sao_Paulo',
  features: {},
  plans: [
    { key: 'free', name: 'Grátis', prices: { monthly: null, annual: null }, limits: {}, extras: {} as never },
    { key: 'pro', name: 'Pro', prices: { monthly: null, annual: null }, limits: {}, extras: {} as never, ...(proTrial ? { trial: proTrial as never } : {}) },
  ],
  ...over,
})

describe('landing v4 (prd-landing-v4)', () => {
  it('?m= conhecido escolhe a variante; o resto cai no padrão', () => {
    for (const m of LANDING_MESSAGES) expect(landingMessageOf(m)).toBe(m)
    expect(landingMessageOf('PROVA')).toBe('padrao')
    expect(landingMessageOf('')).toBe('padrao')
    expect(landingMessageOf(null)).toBe('padrao')
    expect(landingMessageOf(['prova'])).toBe('padrao')
  })

  it('cada ?m= tem uma variante do herói, e o script do <head> conhece as mesmas', () => {
    expect(HERO_VARIANTS.map(v => v.key).sort()).toEqual(['padrao', ...LANDING_MESSAGES].sort())
    for (const m of LANDING_MESSAGES) expect(LANDING_MESSAGE_SCRIPT).toContain(`"${m}"`)
  })

  it('o script do <head> grava data-m só com valor conhecido', () => {
    const run = (search: string) => {
      const attrs: Record<string, string> = {}
      const fn = new Function('location', 'document', 'window', LANDING_MESSAGE_SCRIPT)
      fn({ search }, { documentElement: { setAttribute: (k: string, v: string) => { attrs[k] = v } } }, {})
      return attrs['data-m']
    }
    expect(run('?m=ingles&utm_source=tiktok')).toBe('ingles')
    expect(run('?m=<script>')).toBeUndefined()
    expect(run('')).toBeUndefined()
  })

  it('o teste do Pro só aparece quando o catálogo traz um sem cartão', () => {
    expect(catalogTrial(null)).toBeNull()
    expect(catalogTrial(catalog())).toBeNull()
    expect(catalogTrial(catalog({ trial: { days: 7, card_required: false } }))?.days).toBe(7)
    expect(catalogTrial(catalog({}, { days: 5, card_required: false }))?.days).toBe(5)
    expect(catalogTrial(catalog({ trial: { days: 7, card_required: true } }))).toBeNull()
    expect(catalogTrial(catalog({ trial: { days: 0, card_required: false } }))).toBeNull()
  })

  it('o texto do grátis e das perguntas segue o catálogo, sem número próprio', () => {
    expect(landingGuarantees(null)).toEqual(['Sem cartão', 'Revisão grátis para sempre'])
    expect(landingGuarantees({ days: 7, card_required: false })).toEqual(['Sem cartão', '7 dias de Pro', 'Revisão grátis para sempre'])
    expect(landingFaqs(null)[0]!.a).not.toMatch(/\d/)
    expect(landingFaqs({ days: 10, card_required: false })[0]!.a).toContain('10 dias do Pro')
    const all = JSON.stringify([landingFaqs(null), HERO_VARIANTS, landingGuarantees(null)])
    expect(all).not.toMatch(/R\$|\d+x de|grátis todo mês|podcast grátis/i)
  })

  it('cada área tem nome, texto e uma tela real, e uma só fica em destaque', () => {
    expect(SEGMENTS.map(s => s.name)).toEqual(['Concurso', 'Medicina e faculdade', 'ENEM e vestibular', 'OAB', 'Idiomas'])
    for (const s of SEGMENTS) expect(s.text && s.dot && SHOTS[s.shot]).toBeTruthy()
    expect(SEGMENTS.filter(s => s.featured)).toHaveLength(1)
  })

  it('o título de cada variante tem o trecho do marca-texto', () => {
    for (const v of HERO_VARIANTS) expect(v.title[1].length).toBeGreaterThan(5)
    expect(HERO_VARIANTS[0]!.title.join('')).toBe('Saiba quanto você vai lembrar no dia da prova.')
  })
})
