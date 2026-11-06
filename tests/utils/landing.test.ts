import { describe, it, expect } from 'vitest'
import { AREAS, HERO_VARIANTS, LANDING_MESSAGES, LANDING_MESSAGE_SCRIPT, SCREENS, catalogTrial, landingFaqs, landingMessageOf, landingPlanLines, landingPlansLead, landingPodcastLine, paidPlanName, titleParts } from '~/utils/landing'
import type { PlanCatalog } from '~/types'

const catalog = (over: Partial<PlanCatalog> = {}, proTrial?: object, proName = 'Pro'): PlanCatalog => ({
  currency: 'BRL',
  period: 'calendar_month',
  period_timezone: 'America/Sao_Paulo',
  features: {},
  plans: [
    { key: 'free', name: 'Grátis', prices: { monthly: null, annual: null }, limits: {}, extras: {} as never },
    { key: 'pro', name: proName, prices: { monthly: null, annual: null }, limits: {}, extras: {} as never, ...(proTrial ? { trial: proTrial as never } : {}) },
  ],
  ...over,
})

/** The launch catalog of the API (#136), trimmed to what the landing reads. */
function launch(proName = 'Intensivo'): PlanCatalog {
  const c = catalog({ trial: { days: 7, card_required: false, excludes: ['podcast'], pdf_pages_cap: 100 } }, undefined, proName)
  c.plans[0]!.highlights = ['Cadernos, notas e cards sem limite', 'Revisão com FSRS-6', 'Importar do Anki sem recomeçar do zero', 'Modo recuperação e revisão relâmpago', 'Domínio e acerto por assunto', 'Teste do Pro sem cartão no primeiro material']
  c.plans[1]!.highlights = ['Tudo do Grátis', 'IA sem limite mensal nos cards, no tira-dúvidas e nas questões', 'Podcast curto dos seus pontos fracos']
  c.plans[1]!.limits = { cards_ai: null, pdf_to_note: 20, quiz_ai: null, podcast: 5 }
  c.features = {
    pdf_to_note: { label: 'PDFs transformados em nota', unit: 'por mês', pro_benefit: '20 PDFs por mês, até 500 páginas cada' },
    quiz_ai: { label: 'simulados com IA', unit: 'por mês', pro_benefit: 'Simulados ilimitados, com dissertativas' },
    podcast: { label: 'podcasts', unit: 'por mês', pro_benefit: '5 episódios de até 8 min' },
  }
  return c
}

describe('landing D (prd-landing-d)', () => {
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

  it('o script do <head> grava data-m só com valor conhecido e liga o movimento só sem movimento reduzido', () => {
    const run = (search: string, reduce = false) => {
      const attrs: Record<string, string> = {}
      const classes = new Set<string>()
      const doc = { documentElement: { setAttribute: (k: string, v: string) => { attrs[k] = v }, classList: { add: (c: string) => classes.add(c), remove: (c: string) => classes.delete(c) } } }
      const win = { matchMedia: () => ({ matches: reduce }) }
      const fn = new Function('location', 'document', 'window', 'setTimeout', LANDING_MESSAGE_SCRIPT)
      fn({ search }, doc, win, () => 0)
      return { m: attrs['data-m'], motion: classes.has('lp-motion') }
    }
    expect(run('?m=ingles&utm_source=tiktok')).toEqual({ m: 'ingles', motion: true })
    expect(run('?m=<script>').m).toBeUndefined()
    expect(run('').m).toBeUndefined()
    expect(run('', true).motion).toBe(false)
  })

  it('o título de cada variante grifa "peixe" (owner, 06/11)', () => {
    for (const v of HERO_VARIANTS) {
      const marks = v.lines.flatMap(titleParts).filter(p => p.mark).map(p => p.text)
      expect(marks, v.key).toEqual(['peixe'])
    }
    expect(HERO_VARIANTS[0]!.lines.join(' ').replace(/\*/g, '')).toBe('Chega de memória de peixe.')
    expect(titleParts('de *peixe*.')).toEqual([{ text: 'de ', mark: false }, { text: 'peixe', mark: true }, { text: '.', mark: false }])
  })

  it('cada área tem dor, 3 soluções, tela real e chamada própria', () => {
    expect(AREAS.map(a => a.key)).toEqual(['concurso', 'faculdade', 'oab', 'enem', 'idiomas'])
    for (const a of AREAS) {
      expect(a.pain && a.cta && SCREENS[a.screen]).toBeTruthy()
      expect(a.points).toHaveLength(3)
    }
    expect(new Set(AREAS.map(a => a.cta)).size).toBe(AREAS.length)
  })

  it('o teste só aparece quando o catálogo traz um sem cartão', () => {
    expect(catalogTrial(null)).toBeNull()
    expect(catalogTrial(catalog())).toBeNull()
    expect(catalogTrial(catalog({ trial: { days: 7, card_required: false } }))?.days).toBe(7)
    expect(catalogTrial(catalog({}, { days: 5, card_required: false }))?.days).toBe(5)
    expect(catalogTrial(catalog({ trial: { days: 7, card_required: true } }))).toBeNull()
    expect(catalogTrial(catalog({ trial: { days: 0, card_required: false } }))).toBeNull()
  })

  it('o nome do plano pago vem do catálogo, e sem catálogo é "Intensivo"', () => {
    expect(paidPlanName(null)).toBe('Intensivo')
    expect(paidPlanName(catalog())).toBe('Pro')
    expect(paidPlanName(launch())).toBe('Intensivo')
  })

  it('dois cartões de 5 linhas, só do catálogo', () => {
    const c = launch()
    expect(landingPlanLines(c, 'free')).toEqual([
      'Cadernos, notas e cards sem limite',
      'Revisão com FSRS-6',
      'Importar do Anki sem recomeçar do zero',
      'Modo recuperação e revisão relâmpago',
      '7 dias do Intensivo no primeiro material, sem cartão',
    ])
    expect(landingPlanLines(c, 'pro')).toEqual([
      'Tudo do Grátis',
      'IA sem limite mensal nos cards, no tira-dúvidas e nas questões',
      '20 PDFs por mês, até 500 páginas cada',
      'Simulados ilimitados, com dissertativas',
      '5 episódios de até 8 min',
    ])
    // Without the trial, the free card keeps its own highlights (5); without the catalog, nothing
    const noTrial = { ...c, trial: null }
    expect(landingPlanLines(noTrial, 'free')).toHaveLength(5)
    expect(landingPlanLines(noTrial, 'free').join(' ')).not.toMatch(/teste/i)
    expect(landingPlanLines(null, 'free')).toEqual([])
    // A benefit the plan does not have (limit 0) gives its place to a highlight
    const noPodcast = launch()
    noPodcast.plans[1]!.limits.podcast = 0
    expect(landingPlanLines(noPodcast, 'pro')).toContain('Podcast curto dos seus pontos fracos')
    expect(landingPlanLines(noPodcast, 'pro')).not.toContain('5 episódios de até 8 min')
  })

  it('textos dos planos, do podcast e das perguntas seguem o catálogo, sem número próprio', () => {
    expect(landingPlansLead(launch())).toBe('A IA você testa por 7 dias, sem cartão, a partir do primeiro material. No Intensivo, ela acompanha você até a prova.')
    expect(landingPlansLead(catalog())).not.toMatch(/\d/)
    expect(landingPodcastLine(launch())).toBe('No Intensivo: 5 episódios de até 8 min por mês. O teste de 7 dias não inclui o podcast.')
    expect(landingPodcastLine(null)).toBe('Os episódios fazem parte do Intensivo.')
    expect(landingFaqs(launch('Pro')).map(f => f.q)).toContain('Como cancelo o Pro?')
    expect(landingFaqs(launch())[0]!.a).toContain('7 dias do Intensivo')
    expect(landingFaqs(null)[0]!.a).not.toMatch(/\d/)
    const all = JSON.stringify([landingFaqs(null), HERO_VARIANTS, AREAS, landingPlansLead(null), landingPodcastLine(null)])
    expect(all).not.toMatch(/R\$|\d+x de|grátis todo mês|podcast grátis|FSRS/i)
  })
})
