import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount, flushPromises } from '@vue/test-utils'
import HomeGreeting from '~/components/home/HomeGreeting.vue'
import HomePlan from '~/components/home/HomePlan.vue'
import HomeExam from '~/components/home/HomeExam.vue'
import HomeNotebooks from '~/components/home/HomeNotebooks.vue'
import ActivationChecklist from '~/components/ui/ActivationChecklist.vue'
import { buildDayPlan } from '~/composables/useDayPlan'
import type { ExamUpcoming, Stats, TopicProgress } from '~/types'
import { axeViolations } from './ui/axe'

const { apiMock, trackMock, showAddMock } = vi.hoisted(() => ({ apiMock: vi.fn(), trackMock: vi.fn(), showAddMock: vi.fn() }))

mockNuxtImport('useNuxtApp', original => () => new Proxy(original(), {
  get: (target, key) => (key === '$api' ? apiMock : Reflect.get(target, key)),
}))
mockNuxtImport('useAnalytics', () => () => ({ track: trackMock, identify: vi.fn(), reset: vi.fn() }))
mockNuxtImport('useAddSheet', () => () => ({ open: ref(false), preset: ref(null), show: showAddMock, close: vi.fn() }))

function memoryStorage(): Storage {
  const m = new Map<string, string>()
  return {
    get length() { return m.size },
    key: (i: number) => [...m.keys()][i] ?? null,
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => { m.set(k, String(v)) },
    removeItem: (k: string) => { m.delete(k) },
    clear: () => m.clear(),
  }
}

enableAutoUnmount(afterEach)
beforeEach(() => {
  apiMock.mockReset()
  trackMock.mockReset()
  showAddMock.mockReset()
  vi.stubGlobal('localStorage', memoryStorage())
})
afterEach(() => {
  vi.unstubAllGlobals()
  document.documentElement.classList.remove('dark')
  document.body.innerHTML = ''
})

const stats = (over: Partial<Stats> = {}): Stats => ({
  total_cards: 900, total_decks: 1, due_today: 45, reviewed_today: 20, cards_reviewed_today: 20, streak: 6, streak_at_risk: false,
  ratings_today: { again: 0, hard: 0, good: 0, easy: 0 },
  goal: { batch_size: 20, target_batches: 3, done_batches: 1, met: false, minutes_left: 12 },
  ...over,
})

describe('HomeGreeting', () => {
  it('com plano: frase com minutos, meta "1 de 3 lotes" (forma + texto) e sequência', async () => {
    const w = await mountSuspended(HomeGreeting, { props: { stats: stats(), userName: 'Rafael Souza', minutes: 34 }, attachTo: document.body })
    expect(w.get('h1').text()).toMatch(/^(Bom dia|Boa tarde|Boa noite), Rafael\. Hoje são uns 35 minutos\.$/)
    const bar = w.get('[role="progressbar"]')
    expect(bar.attributes('aria-label')).toBe('Meta de hoje: 1 de 3 lotes')
    expect(bar.findAll('span')).toHaveLength(3)
    expect(w.get('[data-testid="home-goal"]').text()).toContain('1 de 3 lotes')
    expect(w.get('[data-testid="hero-streak"]').text()).toBe('6 dias seguidos de estudo')
    // The only tinted block of the screen
    expect(w.findAll('.bg-tinted')).toHaveLength(1)
    expect(apiMock).not.toHaveBeenCalled()
    expect(await axeViolations(w.element)).toEqual([])
    document.documentElement.classList.add('dark')
    expect(await axeViolations(w.element)).toEqual([])
  })

  it('meta 0 de 1 e sequência em risco', async () => {
    const w = await mountSuspended(HomeGreeting, {
      props: { stats: stats({ due_today: 7, reviewed_today: 0, streak: 5, streak_at_risk: true, goal: { batch_size: 20, target_batches: 1, done_batches: 0, met: false, minutes_left: 2 } }), userName: 'Ana' },
    })
    expect(w.get('[data-testid="home-goal"]').text()).toContain('0 de 1 lote')
    expect(w.get('[data-testid="hero-streak"]').text()).toBe('Revise hoje para manter 5 dias')
  })

  it('meta cumprida celebra uma vez por dia neste aparelho e registra o evento', async () => {
    const met = stats({ due_today: 0, reviewed_today: 60, goal: { batch_size: 20, target_batches: 3, done_batches: 3, met: true, minutes_left: 0 } })
    apiMock.mockResolvedValue({ data: { due_count: 12, estimated_minutes: 3 } })
    const first = await mountSuspended(HomeGreeting, { props: { stats: met, userName: 'Ana' } })
    expect(first.get('[data-testid="home-goal"]').text()).toContain('Meta de hoje cumprida')
    expect(first.find('[role="status"]').text()).toContain('Meta cumprida')
    expect(trackMock).toHaveBeenCalledWith('home_goal_met', { target_batches: 3 })
    first.unmount()

    const again = await mountSuspended(HomeGreeting, { props: { stats: met, userName: 'Ana' } })
    expect(again.find('[role="status"]').exists()).toBe(false)
    expect(trackMock).toHaveBeenCalledTimes(1)
  })

  it('tudo em dia: "Tudo em dia" e a linha de amanhã (só nesse estado busca /review/tomorrow)', async () => {
    apiMock.mockResolvedValueOnce({ data: { due_count: 12, estimated_minutes: 3 } })
    const w = await mountSuspended(HomeGreeting, { props: { stats: stats({ due_today: 0, streak: 3 }), userName: 'Ana Souza' } })
    await flushPromises()
    expect(w.find('[data-testid="hero-up-to-date"]').exists()).toBe(true)
    expect(w.get('h1').text()).toBe('Tudo em dia, Ana.')
    expect(w.get('[data-testid="hero-tomorrow"]').text()).toBe('Amanhã: 12 cards · ≈3 min')
    expect(apiMock).toHaveBeenCalledWith('/review/tomorrow')
  })

  it('conta nova: boas-vindas, sem meta nem "Tudo em dia"', async () => {
    const w = await mountSuspended(HomeGreeting, { props: { stats: stats({ total_cards: 0, due_today: 0, streak: 0, goal: { batch_size: 20, target_batches: 0, done_batches: 0, met: false, minutes_left: 0 } }), userName: 'Ana' } })
    expect(w.get('h1').text()).toBe('Que bom ter você aqui, Ana.')
    expect(w.find('[data-testid="home-goal"]').exists()).toBe(false)
    expect(w.text()).not.toContain('Tudo em dia')
  })

  it('erro nos números: só a saudação (nunca "Tudo em dia" nem boas-vindas)', async () => {
    const w = await mountSuspended(HomeGreeting, { props: { stats: null, error: true, userName: 'Ana' } })
    expect(w.get('h1').text()).toMatch(/^(Bom dia|Boa tarde|Boa noite), Ana\.$/)
    expect(w.find('[data-testid="hero-streak"]').exists()).toBe(false)
  })

  it('carregando: skeleton do tamanho do bloco', async () => {
    const w = await mountSuspended(HomeGreeting, { props: { stats: null, loading: true } })
    expect(w.find('[data-testid="skeleton"]').exists()).toBe(true)
    expect(w.find('h1').exists()).toBe(false)
  })
})

describe('HomePlan', () => {
  const steps = () => buildDayPlan({
    stats: stats(),
    backlog: { overdue_count: 893 } as never,
    progress: [{ id: 'trf', parent_id: null, name: 'TRF', flashcards_count: 50, notes_count: 2, review_count: 0, progress: 0.3, session_count: 45 }],
    pendingActions: [],
    podcasts: [{ id: 'p1', title: 'Erros', status: 'ready', audio_url: 'x.mp3', duration_seconds: 600, created_at: new Date().toISOString() }],
    recentNote: null,
  })

  it('um primário só, botões ligados ao título do passo, "Recuperar atraso" para /praticar', async () => {
    const w = await mountSuspended(HomePlan, { props: { steps: steps() }, attachTo: document.body })
    expect(w.get('h2').text()).toBe('Plano do dia')
    expect(w.findAll('li')).toHaveLength(3)
    expect(w.findAll('.bg-action.shadow-press')).toHaveLength(1)
    const start = w.get('a[href="/revisar"]')
    expect(start.text()).toBe('Começar')
    expect(document.getElementById(start.attributes('aria-describedby')!)!.textContent).toBe('Revisar 45 cards de TRF')
    expect(w.get('a[href="/praticar"]').text()).toBe('Recuperar atraso')
    expect(await axeViolations(w.element)).toEqual([])
  })

  it('Ouvir emite o passo (a página toca no mini-player); sobrevivência oferece "Desligar"', async () => {
    const list = steps()
    list[0]!.survival = true
    const w = await mountSuspended(HomePlan, { props: { steps: list } })
    await w.get('[data-testid="plan-step-listen"] button').trigger('click')
    expect(w.emitted('act')![0]![0]).toMatchObject({ key: 'listen' })
    expect(w.text()).toContain('Modo recuperação ligado')
    await w.findAll('button').find(b => b.text() === 'Desligar')!.trigger('click')
    expect(w.emitted('survival-off')).toHaveLength(1)
  })

  it('erro mostra "Tentar de novo"; carregando mostra 3 linhas', async () => {
    const err = await mountSuspended(HomePlan, { props: { steps: [], error: true } })
    expect(err.text()).toContain('Não foi possível carregar seu plano de hoje')
    await err.get('button').trigger('click')
    expect(err.emitted('retry')).toHaveLength(1)

    const loading = await mountSuspended(HomePlan, { props: { steps: [], loading: true } })
    expect(loading.findAll('[data-testid="skeleton"]')).toHaveLength(3)
    expect(loading.get('section').attributes('aria-busy')).toBe('true')
  })
})

describe('HomeExam', () => {
  const exam = (over: Partial<ExamUpcoming>): ExamUpcoming => ({
    id: 'e', title: 'TRF 4ª Região', exam_date: '2026-12-17', days_remaining: 45, urgency_color: 'green', reta_final_enabled: false,
    reta_final_active: false, cards_per_day: 60, cards_weak: 0, topics: [], podcast_suggestion: false, ...over,
  })

  it('a prova mais próxima a qualquer distância, com ritmo e "Ver provas"', async () => {
    const w = await mountSuspended(HomeExam, { props: { exams: [exam({ id: 'b', title: 'Outra', days_remaining: 90 }), exam({})] } })
    expect(w.text()).toContain('TRF 4ª Região em 45 dias')
    expect(w.text()).toContain('Ritmo: 60 cards por dia até lá')
    expect(w.get('a').attributes('href')).toBe('/progresso#provas')
    await w.get('a').trigger('click')
    expect(trackMock).toHaveBeenCalledWith('home_exam_click', {})
  })

  it('amanhã, hoje e Reta final; nada sem prova', async () => {
    expect((await mountSuspended(HomeExam, { props: { exams: [exam({ days_remaining: 1, reta_final_active: true })] } })).text()).toMatch(/TRF 4ª Região é amanhã\s*Reta final/)
    expect((await mountSuspended(HomeExam, { props: { exams: [exam({ days_remaining: 0 })] } })).text()).toContain('TRF 4ª Região é hoje')
    expect((await mountSuspended(HomeExam, { props: { exams: [] } })).find('section').exists()).toBe(false)
  })
})

describe('HomeNotebooks', () => {
  const t = (over: Partial<TopicProgress> & { id: string }): TopicProgress => ({
    name: over.id, parent_id: null, color: null, flashcards_count: 10, notes_count: 1, review_count: 0, progress: 0.41, session_count: 0, ...over,
  })

  it('só raízes, ordem por sessão → última revisão → cards, até 5, com "Ver todos (N)"', async () => {
    const topics = [
      t({ id: 'a', session_count: 3 }),
      t({ id: 'sub', parent_id: 'a', session_count: 99 }),
      t({ id: 'b', session_count: 45, color: 'purple' }),
      t({ id: 'c', last_reviewed_at: '2026-11-01T10:00:00Z' }),
      t({ id: 'd', flashcards_count: 0 }),
      t({ id: 'e', flashcards_count: 500 }),
      t({ id: 'f' }),
    ]
    const w = await mountSuspended(HomeNotebooks, { props: { topics }, attachTo: document.body })
    const rows = w.findAll('ul a')
    expect(rows.map(r => r.attributes('href'))).toEqual(['b', 'a', 'c', 'e', 'f'].map(id => `/cadernos/${id}`))
    expect(w.text()).not.toContain('sub')
    expect(w.text()).toContain('Ver todos (6)')
    expect(rows[0]!.text()).toContain('45 hoje')
    expect(rows[2]!.text()).toContain('em dia')
    expect(rows[0]!.get('[role="progressbar"]').attributes('aria-label')).toBe('Domínio de b: 41%')
    expect(await axeViolations(w.element)).toEqual([])
  })

  it('caderno sem cards é "novo"; erro tem "Tentar de novo"', async () => {
    const w = await mountSuspended(HomeNotebooks, { props: { topics: [t({ id: 'x', flashcards_count: 0, progress: 0 })] } })
    expect(w.text()).toContain('novo')
    expect(w.text()).not.toContain('Ver todos')
    const err = await mountSuspended(HomeNotebooks, { props: { topics: [], error: true } })
    expect(err.text()).toContain('Não foi possível carregar seus cadernos')
  })
})

describe('UiActivationChecklist (Hoje)', () => {
  const props = { hasTopics: true, hasMaterial: false, hasCards: false, hasReviewed: false, streak: 0, topicId: 't1' }

  it('com primary, o 1º passo pendente é o único primário; "Adicionar material" abre o "+ Adicionar"', async () => {
    const w = await mountSuspended(ActivationChecklist, { props: { ...props, primary: true }, attachTo: document.body })
    expect(w.text()).toContain('1 de 5 concluídos')
    const primary = w.findAll('.bg-action.shadow-press')
    expect(primary).toHaveLength(1)
    expect(primary[0]!.text()).toBe('Adicionar')
    await primary[0]!.trigger('click')
    expect(showAddMock).toHaveBeenCalledWith('checklist')
    expect(w.emitted('select')![0]).toEqual(['material'])
    expect(w.get('a[href="/cadernos/t1/cards"]').text()).toContain('Gerar ou criar cards')
    expect(await axeViolations(w.element)).toEqual([])
  })

  it('sem primary, nenhum botão primário; tudo feito some', async () => {
    const w = await mountSuspended(ActivationChecklist, { props })
    expect(w.findAll('.bg-action.shadow-press')).toHaveLength(0)
    const done = await mountSuspended(ActivationChecklist, { props: { ...props, hasMaterial: true, hasCards: true, hasReviewed: true, streak: 3 } })
    expect(done.find('section').exists()).toBe(false)
  })
})
