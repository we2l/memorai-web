import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import ScopeHeader from '~/components/caderno/ScopeHeader.vue'
import NextStep from '~/components/caderno/NextStep.vue'
import SubjectTable from '~/components/caderno/SubjectTable.vue'
import MaterialRow from '~/components/caderno/MaterialRow.vue'
import PracticeRow from '~/components/caderno/PracticeRow.vue'
import EmptyScope from '~/components/caderno/EmptyScope.vue'
import type { MaterialRow as Row, ScopeSubject, ScopeSummary } from '~/types'
import { axeViolations } from './ui/axe'

const { apiMock } = vi.hoisted(() => ({ apiMock: vi.fn() }))
mockNuxtImport('useNuxtApp', original => () => new Proxy(original(), {
  get: (target, key) => (key === '$api' ? apiMock : Reflect.get(target, key)),
}))

enableAutoUnmount(afterEach)
beforeEach(() => apiMock.mockReset())
afterEach(() => {
  document.documentElement.classList.remove('dark')
  document.body.innerHTML = ''
})

const subject = (id: string, extra: Partial<ScopeSubject> = {}): ScopeSubject => ({
  id, name: id, color: null, depth: 1, parent_id: 'root', cards: 100, mastery: 48, questions: { answered: 0, accuracy: null }, session_count: 5, weak: false, ...extra,
})

function summary(over: Partial<ScopeSummary> = {}, topic: Partial<ScopeSummary['topic']> = {}): ScopeSummary {
  return {
    topic: { id: 'root', name: 'TRF 4ª Região', color: 'purple', depth: 0, learning_mode: 'exam', parent_id: null, ...topic },
    path: [],
    counts: { cards: 2200, materials: 14, subjects: 2 },
    mastery: { percent: 41, in_day: 902, cards: 2200 },
    questions: { answered: 120, correct: 76, accuracy: 63 },
    session: { count: 45, overdue: 893, errors: 23 },
    can_quiz: { ok: true },
    can_podcast: { ok: false, code: 'needs_reviewed_cards', requirement: { required: 5, current: 2 } },
    exam: { id: 'e', title: 'TRF', days_remaining: 45, cards_per_day: 60, reta_final_active: false },
    next_step: null,
    listen: { id: 'p1', title: 'Seus erros', duration_seconds: 720 },
    subjects: [subject('Português'), subject('Constitucional', { weak: true, questions: { answered: 64, accuracy: 58 } }), subject('Controle', { depth: 2, parent_id: 'Constitucional', mastery: 31 })],
    special: { quiz_errors: { cards: 23, session_count: 9 }, loose: { cards: 0, session_count: 0 } },
    ...over,
  }
}

const primaries = (el: Element) => el.querySelectorAll('.bg-action.text-on-action').length

describe('CadernoScopeHeader (prd-4b-caderno-v3 RF-F3)', () => {
  it('um número de sessão: "Revisar hoje · 45" é o único primário; domínio e acerto são contexto', async () => {
    const w = await mountSuspended(ScopeHeader, { props: { summary: summary(), roots: [{ id: 'root', name: 'TRF 4ª Região' }, { id: 'b', name: 'Inglês' }] } })
    expect(w.get('[data-testid="scope-review"]').text()).toBe('Revisar hoje · 45')
    expect(w.get('[data-testid="scope-review"]').attributes('href')).toBe('/revisar?topic_id=root')
    expect(primaries(w.element)).toBe(1)
    expect(w.text()).toContain('41%')
    expect(w.text()).toContain('de domínio · 902 de 2.200 em dia')
    expect(w.text()).toContain('63%de acerto em 120 questões')
    expect(w.get('[data-testid="scope-context"]').text()).toBe('Prova em 45 dias · 60 cards por dia · Concurso')
    expect(w.get('[data-testid="scope-overdue"]').text()).toContain('893 atrasados')
  })

  it('modo concurso: Questões no cabeçalho, ao lado de Revisar; outro modo: só Ouvir', async () => {
    const exam = await mountSuspended(ScopeHeader, { props: { summary: summary(), roots: [] } })
    expect(exam.find('[data-testid="scope-quiz"]').exists()).toBe(true)
    expect(exam.get('[data-testid="scope-listen"]').text()).toBe('Ouvir · 12 min')
    const academic = await mountSuspended(ScopeHeader, { props: { summary: summary({}, { learning_mode: 'academic' }), roots: [] } })
    expect(academic.find('[data-testid="scope-quiz"]').exists()).toBe(false)
  })

  it('sem cards e com material: o primário é "Gerar cards de…" (próximo passo do servidor)', async () => {
    const s = summary({
      counts: { cards: 0, materials: 2, subjects: 0 }, session: { count: 0, overdue: 0, errors: 0 }, questions: null,
      next_step: { kind: 'generate_cards', title: 'Gerar cards de Apostila', detail: null, target: { type: 'note', id: 'n1', topic_id: 'root' } },
    })
    const w = await mountSuspended(ScopeHeader, { props: { summary: s, roots: [] } })
    expect(w.get('[data-testid="scope-generate"]').text()).toBe('Gerar cards de Apostila')
    expect(w.get('[data-testid="scope-generate"]').attributes('href')).toBe('/cadernos/root/material/n1?workshop=1')
    expect(primaries(w.element)).toBe(1)
  })

  it('vazio: sem número e sem primário, com a frase', async () => {
    const s = summary({ counts: { cards: 0, materials: 0, subjects: 0 }, session: { count: 0, overdue: 0, errors: 0 }, questions: null, exam: null }, { learning_mode: null })
    const w = await mountSuspended(ScopeHeader, { props: { summary: s, roots: [] } })
    expect(primaries(w.element)).toBe(0)
    expect(w.text()).toContain('Comece adicionando o que você vai estudar.')
    expect(w.find('[data-testid="scope-review"]').exists()).toBe(false)
  })

  it('matéria aberta: caminho até o caderno e a nota de que o caderno já inclui estes N', async () => {
    const s = summary({ path: [{ id: 'root', name: 'TRF 4ª Região' }], session: { count: 20, overdue: 0, errors: 0 } }, { id: 'm1', name: 'Constitucional', depth: 1, parent_id: 'root', color: null })
    const w = await mountSuspended(ScopeHeader, { props: { summary: s, roots: [] } })
    const nav = w.get('nav[aria-label="Caminho"]')
    expect(nav.findAll('a').map(a => a.attributes('href'))).toEqual(['/cadernos', '/cadernos/root'])
    expect(w.get('h1').text()).toBe('Constitucional')
    expect(w.text()).toContain('O Revisar hoje de TRF 4ª Região já inclui estes 20.')
  })

  it('axe sem violação, claro e escuro', async () => {
    const w = await mountSuspended(ScopeHeader, { props: { summary: summary(), roots: [{ id: 'b', name: 'Inglês' }] }, attachTo: document.body })
    expect(await axeViolations(w.element)).toEqual([])
    document.documentElement.classList.add('dark')
    expect(await axeViolations(w.element)).toEqual([])
  })
})

describe('CadernoNextStep (RF-F4)', () => {
  it.each([
    ['generate_cards', 'Gerar cards', '/cadernos/m1/material/n1?workshop=1', { type: 'note', id: 'n1', topic_id: 'm1' }],
    ['review_errors', 'Reforçar erros', '/revisar?topic_id=root&errors_only=1', { type: 'topic', id: 'root', topic_id: 'root' }],
    ['quiz', 'Fazer questões', '/simulados?topic_id=m2', { type: 'topic', id: 'm2', topic_id: 'm2' }],
    ['continue', 'Continuar leitura', '/cadernos/m1/material/n1', { type: 'note', id: 'n1', topic_id: 'm1' }],
  ] as const)('%s → "%s" leva ao alvo', async (kind, label, href, target) => {
    const w = await mountSuspended(NextStep, { props: { step: { kind, title: 'T', detail: 'D', target: { ...target } } } })
    const link = w.get('a')
    expect(link.text()).toBe(label)
    expect(link.attributes('href')).toBe(href)
    expect(w.get('section').classes()).toContain('bg-tinted')
  })
})

describe('CadernoSubjectTable (RF-F5)', () => {
  it('matéria seguida dos assuntos, cada linha um link com nome acessível completo; "ponto fraco"', async () => {
    const s = summary()
    const w = await mountSuspended(SubjectTable, { props: { subjects: s.subjects, scopeDepth: 0, canAdd: true }, attachTo: document.body })
    const rows = w.findAll('[data-testid="subject-row"]')
    expect(rows.map(r => r.attributes('href'))).toEqual(['/cadernos/Portugu%C3%AAs', '/cadernos/Constitucional', '/cadernos/Controle'])
    expect(rows[1]!.attributes('aria-label')).toBe('Constitucional, ponto fraco, domínio 48%, acerto em questões 58%, 5 para hoje')
    expect(rows[0]!.attributes('aria-label')).toContain('acerto em questões: faça 10 questões')
    expect(w.text()).toContain('ponto fraco')
    expect(w.get('h2').text()).toBe('Matérias')
    expect(w.get('[data-testid="scope-add-subject"]').text()).toBe('Matéria')
    expect(await axeViolations(w.element)).toEqual([])
  })

  it('na matéria: "Assuntos"; no 2º nível, sem "+ Assunto"', async () => {
    const w = await mountSuspended(SubjectTable, { props: { subjects: [subject('a', { depth: 2 })], scopeDepth: 1, canAdd: false } })
    expect(w.get('h2').text()).toBe('Assuntos')
    expect(w.find('[data-testid="scope-add-subject"]').exists()).toBe(false)
  })
})

describe('CadernoMaterialRow (RF-F6)', () => {
  const row = (extra: Partial<Row> = {}): Row => ({
    kind: 'pdf', id: 'd1', note_id: 'n1', title: 'Apostila', topic: { id: 'm1', name: 'Constitucional' }, pages: 212, parts: 6, words: null,
    cards: 148, mastery: 44, session_count: 12, ahead_count: 148, status: 'ready', progress: null, updated_at: '', ...extra,
  })

  it('linha do PDF: o que tem, onde está, "Revisar 12" do recorte (scope=document:)', async () => {
    const w = await mountSuspended(MaterialRow, { props: { row: row(), scopeId: 'root' } })
    expect(w.get('[data-testid="material-meta"]').text()).toBe('PDF · 212 páginas · 6 partes · 148 cards · domínio 44% · Constitucional')
    expect(w.get('[data-testid="material-title"]').attributes('href')).toBe('/cadernos/m1/material/n1')
    expect(w.get('[data-testid="material-review"]').attributes('href')).toBe('/revisar?scope=document:d1')
  })

  it('nota no próprio escopo: palavras em "mil", sem o nome da matéria', async () => {
    const w = await mountSuspended(MaterialRow, { props: { row: row({ kind: 'note', id: 'n2', note_id: 'n2', pages: null, parts: null, words: 1800, cards: 18, mastery: 71, session_count: 4 }), scopeId: 'm1' } })
    expect(w.get('[data-testid="material-meta"]').text()).toBe('Nota · 1,8 mil palavras · 18 cards · domínio 71%')
    expect(w.get('[data-testid="material-review"]').attributes('href')).toBe('/revisar?scope=note:n2')
  })

  it('estados: lendo (3 de 12), falhou com "Tentar de novo", limite do mês com "Ver planos"', async () => {
    apiMock.mockResolvedValue({ data: { id: 'd1', status: 'completed', note_generation_status: 'generating', note_generation_progress: 3, note_total_batches: 12 } })
    const reading = await mountSuspended(MaterialRow, { props: { row: row({ status: 'generating', progress: { done: 3, total: 12 }, cards: 0, session_count: 0 }), scopeId: 'root' } })
    expect(reading.text()).toContain('Lendo o PDF · 3 de 12')
    expect(reading.find('[data-testid="material-review"]').exists()).toBe(false)
    const failed = await mountSuspended(MaterialRow, { props: { row: row({ status: 'failed' }), scopeId: 'root' } })
    await failed.get('button.underline').trigger('click')
    expect(failed.emitted('retry')).toHaveLength(1)
    const blocked = await mountSuspended(MaterialRow, { props: { row: row({ status: 'blocked', note_id: null }), scopeId: 'root', blockedReason: 'feature_limit' } })
    expect(blocked.text()).toContain('Limite do mês atingido')
    expect(blocked.text()).toContain('Ver planos')
    expect(blocked.find('a[data-testid="material-title"]').exists()).toBe(false)
  })
})

describe('CadernoPracticeRow (RF-F7)', () => {
  it('quatro atalhos, cada um com o requisito em vez de sumir; concurso = simulado cronometrado', async () => {
    const w = await mountSuspended(PracticeRow, { props: { summary: summary() }, attachTo: document.body })
    const links = w.findAll('a')
    expect(links.map(a => a.attributes('href'))).toEqual(['/simulados?topic_id=root', '/podcasts?topic_id=root', '/cadernos/root/mapa', '/cadernos/root/cards'])
    expect(w.text()).toContain('Simulado cronometrado')
    expect(w.text()).toContain('Revise 5 cards para liberar · faltam 3')
    expect(w.text()).toContain('Todos os cards (2.200)')
    expect(await axeViolations(w.element)).toEqual([])
    document.documentElement.classList.add('dark')
    expect(await axeViolations(w.element)).toEqual([])
  })

  it('idiomas: card avulso no lugar do mapa; fora do concurso: "Questões"', async () => {
    const w = await mountSuspended(PracticeRow, { props: { summary: summary({}, { learning_mode: 'language' }) } })
    expect(w.text()).toContain('Criar card avulso')
    expect(w.text()).not.toContain('Mapa')
    expect(w.text()).toContain('Questões')
  })
})

describe('CadernoEmptyScope (RF-F12)', () => {
  it('um bloco só, com as 5 opções e o primário em "Enviar PDF"', async () => {
    const w = await mountSuspended(EmptyScope, { props: { topicId: 't1', isRoot: true }, attachTo: document.body })
    expect(w.get('h2').text()).toBe('Adicionar ao caderno')
    expect(w.findAll('li')).toHaveLength(5)
    expect(primaries(w.element)).toBe(1)
    expect(w.get('[data-testid="empty-pdf"]').classes()).toContain('bg-action')
    expect(w.get('[data-testid="empty-anki"]').attributes('href')).toBe('/importar?topic_id=t1')
    expect(await axeViolations(w.element)).toEqual([])
  })
})
