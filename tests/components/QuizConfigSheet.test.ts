import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount, flushPromises } from '@vue/test-utils'
import ConfigSheet from '~/components/quiz/ConfigSheet.vue'

const { apiMock, toastShow, plan } = vi.hoisted(() => ({ apiMock: vi.fn(), toastShow: vi.fn(), plan: { value: 'pro' } }))
mockNuxtImport('useNuxtApp', original => () => new Proxy(original(), {
  get: (target, key) => (key === '$api' ? apiMock : Reflect.get(target, key)),
}))
mockNuxtImport('useToast', () => () => ({ show: toastShow, toasts: { value: [] }, dismiss: vi.fn() }))
mockNuxtImport('usePlans', () => () => ({ plans: { value: null }, fetchPlans: vi.fn(), limitOf: (key: string) => ({ extras: { quiz_max_questions: key === 'free' ? 10 : 50, quiz_short_answer: key !== 'free' } }) }))

enableAutoUnmount(afterEach)
afterEach(() => { document.body.innerHTML = '' })

const node = (id: string, name: string, parent: string | null, cards: number, notes: number, children: any[] = []) =>
  ({ id, name, parent_id: parent, flashcards_count: cards, notes_count: notes, children })
const tree = [
  node('trf', 'TRF', null, 0, 0, [
    node('pt', 'Português', 'trf', 40, 1),
    node('const', 'Constitucional', 'trf', 0, 0, [node('ctrl', 'Controle', 'const', 50, 1), node('dir', 'Direitos', 'const', 10, 0)]),
    node('anki', 'Só cards', 'trf', 30, 0),
  ]),
]
const needsMaterial = { ok: false, code: 'needs_material', requirement: { required: 100, current: 60 } }

function api(details: Record<string, unknown>, opts: { create?: () => Promise<unknown>; usage?: unknown; materials?: unknown[] } = {}) {
  apiMock.mockImplementation((url: string, o?: { method?: string }) => {
    if (url.startsWith('/topics/') && url.endsWith('/details')) return Promise.resolve({ data: { id: url.split('/')[2], ...details } })
    if (url.endsWith('/materials')) return Promise.resolve({ data: opts.materials ?? [], meta: { next_cursor: null, total: 0 } })
    if (url === '/usage') return Promise.resolve({ data: opts.usage ?? { features: {} } })
    if (url === '/quizzes' && o?.method === 'POST') return opts.create ? opts.create() : Promise.resolve({ data: { id: 'q1' } })
    return Promise.resolve({ data: [] })
  })
}

async function mountSheet(props: Record<string, unknown>, user: Record<string, unknown> = {}) {
  useTopicStore().tree = tree as any
  useAuthStore().user = { id: 'u', plan: plan.value, ...user } as any
  const wrapper = await mountSuspended(ConfigSheet, { props: { modelValue: true, ...props }, attachTo: document.body })
  await flushPromises()
  return wrapper
}

const scopeSelect = () => document.querySelector('[data-testid="quiz-scope"] select, select[data-testid="quiz-scope"]') as HTMLSelectElement ?? document.querySelector('select') as HTMLSelectElement
const submit = () => document.querySelector('[data-testid="quiz-submit"]') as HTMLButtonElement
const notice = () => document.querySelector('[role="dialog"] p[role="status"]')?.textContent?.trim()
const tab = (name: string) => [...document.querySelectorAll('[role="tab"]')].find(t => t.textContent?.trim() === name) as HTMLButtonElement

describe('QuizConfigSheet (prd-4e-praticar-v3 RF-F2)', () => {
  beforeEach(() => {
    apiMock.mockReset()
    toastShow.mockReset()
    plan.value = 'pro'
  })

  it('abre no escopo de onde a pessoa veio, com o número no primário', async () => {
    api({ can_quiz: { ok: true } })
    await mountSheet({ topicId: 'ctrl', quantity: 20 })
    expect(scopeSelect().value).toBe('ctrl')
    expect(apiMock).toHaveBeenCalledWith('/topics/ctrl/details')
    expect(submit().textContent).toContain('Gerar 20 questões')
    expect(submit().disabled).toBe(false)
  })

  it('mostra o requisito antes e não deixa gerar (F1 RF-F5)', async () => {
    api({ can_quiz: needsMaterial })
    await mountSheet({ topicId: 'pt' })
    expect(notice()).toBe('Escreva 100 palavras em notas para liberar · faltam 40')
    expect(submit().disabled).toBe(true)
  })

  it('422 com code vira a mesma mensagem, nunca um erro cru', async () => {
    const err = Object.assign(new Error('422'), { status: 422, data: { message: 'x', code: 'needs_material', requirement: { required: 100, current: 10 } } })
    api({ can_quiz: { ok: true } }, { create: () => Promise.reject(err) })
    const wrapper = await mountSheet({ topicId: 'pt' })
    submit().click()
    await flushPromises()
    expect(notice()).toBe('Escreva 100 palavras em notas para liberar · faltam 90')
    expect(toastShow).not.toHaveBeenCalled()
    expect(wrapper.emitted('created')).toBeUndefined()
  })

  it('bateria: POST com scope topic: e kind battery', async () => {
    api({ can_quiz: { ok: true } })
    const wrapper = await mountSheet({ topicId: 'ctrl' })
    submit().click()
    await flushPromises()
    expect(apiMock).toHaveBeenCalledWith('/quizzes', expect.objectContaining({ method: 'POST', body: expect.objectContaining({ scope: 'topic:ctrl', kind: 'battery', quantity: 10 }) }))
    expect(wrapper.emitted('created')?.[0]).toEqual([{ id: 'q1' }])
  })

  it('um material do escopo vira scope document:', async () => {
    api({ can_quiz: { ok: true } }, { materials: [{ kind: 'pdf', id: 'd1', note_id: 'n1', title: 'Apostila', status: 'ready' }] })
    await mountSheet({ topicId: 'ctrl', scope: 'document:d1' })
    submit().click()
    await flushPromises()
    expect(apiMock).toHaveBeenCalledWith('/quizzes', expect.objectContaining({ body: expect.objectContaining({ scope: 'document:d1' }) }))
  })

  it('simulado: prévia da distribuição pela regra da API e POST com kind exam e cronômetro', async () => {
    api({ can_quiz: { ok: true } })
    await mountSheet({ topicId: 'trf', tab: 'exam' })
    // Português (40 cards) e Constitucional (60 na subárvore) têm material; "Só cards" (Anki) fica fora
    expect(document.querySelector('[data-testid="quiz-distribution"]')?.textContent).toContain('Português 24 · Constitucional 36')
    expect(submit().textContent).toContain('Gerar simulado de 60')
    submit().click()
    await flushPromises()
    expect(apiMock).toHaveBeenCalledWith('/quizzes', expect.objectContaining({ body: expect.objectContaining({ scope: 'topic:trf', kind: 'exam', quantity: 60, time_limit: 10800, mode: 'exam' }) }))
  })

  it('Free: a cota antes e o simulado do caderno só no Intensivo (nome sem catálogo)', async () => {
    plan.value = 'free'
    api({ can_quiz: { ok: true } }, { usage: { features: { quiz_ai: { used: 0, limit: 1, remaining: 1 } } } })
    await mountSheet({ topicId: 'trf' })
    expect(document.querySelector('[data-testid="quiz-quota"]')?.textContent).toContain('0 de 1 geração este mês')
    const fifty = [...document.querySelectorAll('option')].find(o => o.textContent?.startsWith('50 questões'))!
    expect(fifty.textContent).toContain('No Intensivo')
    expect((fifty as HTMLOptionElement).disabled).toBe(true)
    tab('Simulado').click()
    await flushPromises()
    expect(submit().disabled).toBe(true)
    expect(document.body.textContent).toContain('é do Intensivo')
  })

  it('Grátis com o teste disponível e e-mail confirmado: sem "0 de 0" nem bloqueio, o clique chega ao servidor (prd-planos-lancamento RF-F7b)', async () => {
    plan.value = 'free'
    api({ can_quiz: { ok: true } }, { usage: { tier: 'free', features: { quiz_ai: { used: 0, limit: 0, remaining: 0 } } } })
    await mountSheet({ topicId: 'trf' }, { email_verified: true, trial: { status: 'available', started_at: null, ends_at: null } })
    expect(document.querySelector('[data-testid="quiz-quota"]')).toBeNull()
    expect(submit().textContent).toContain('Gerar 10 questões')
    submit().click()
    await flushPromises()
    expect(apiMock).toHaveBeenCalledWith('/quizzes', expect.objectContaining({ method: 'POST' }))
  })

  it('Grátis depois do teste (cota 0): "Ver o Intensivo" abre o aviso em vez de gerar', async () => {
    plan.value = 'free'
    api({ can_quiz: { ok: true } }, { usage: { tier: 'free', features: { quiz_ai: { used: 0, limit: 0, remaining: 0 } } } })
    const events: Event[] = []
    const listen = (e: Event) => events.push(e)
    window.addEventListener('feature-limit-reached', listen)
    await mountSheet({ topicId: 'trf' }, { email_verified: true, trial: { status: 'used', started_at: '2026-10-01T00:00:00Z', ends_at: '2026-10-08T00:00:00Z' } })
    expect(submit().textContent).toContain('Ver o Intensivo')
    submit().click()
    await flushPromises()
    window.removeEventListener('feature-limit-reached', listen)
    expect(events).toHaveLength(1)
    expect(apiMock).not.toHaveBeenCalledWith('/quizzes', expect.anything())
  })

  it('Intensivo aos 80%: só a linha "Restam N"; no limite, a data e o primário desabilitado, sem upgrade (prd-uso-justo RF-F3)', async () => {
    api({ can_quiz: { ok: true } }, { usage: { tier: 'pro', resets_at: '2026-12-01T00:00:00-03:00', features: { quiz_ai: { used: 32, limit: 40, remaining: 8, near_limit: true } } } })
    await mountSheet({ topicId: 'pt' })
    expect(document.querySelector('[data-testid="quiz-quota"]')).toBeNull()
    expect(document.querySelector('[data-testid="usage-notice"]')?.textContent?.trim()).toBe('Restam 8 de 40 usos com IA este mês.')
    expect(submit().disabled).toBe(false)
    document.body.innerHTML = ''

    api({ can_quiz: { ok: true } }, { usage: { tier: 'pro', resets_at: '2026-12-01T00:00:00-03:00', features: { quiz_ai: { used: 40, limit: 40, remaining: 0, near_limit: true } } } })
    await mountSheet({ topicId: 'pt' })
    expect(document.querySelector('[data-testid="usage-notice"]')?.textContent?.trim()).toBe('Você usou 40 de 40 usos com IA deste mês. A contagem recomeça em 01/12.')
    expect(submit().disabled).toBe(true)
    expect(submit().textContent).not.toContain('Ver o')
  })

  it('Grátis na prévia (prd-uso-justo §9): "Prévia grátis: 0 de 1 …" no lugar da contagem do mês', async () => {
    plan.value = 'free'
    api({ can_quiz: { ok: true } }, { usage: { tier: 'free', period: 'lifetime', resets_at: null, period_start: null, period_end: null, features: { quiz_ai: { used: 0, limit: 1, remaining: 1 } } } })
    await mountSheet({ topicId: 'pt' }, { email_verified: true, trial: { status: 'used', started_at: null, ends_at: null } })
    expect(document.querySelector('[data-testid="quiz-quota"]')).toBeNull()
    expect(document.querySelector('[data-testid="usage-notice"]')?.textContent?.trim()).toBe('Prévia grátis: 0 de 1 usos com IA.')
    expect(submit().disabled).toBe(false)
  })

  it('Intensivo abaixo de 80%: nenhuma linha de cota', async () => {
    api({ can_quiz: { ok: true } }, { usage: { tier: 'pro', features: { quiz_ai: { used: 3, limit: 40, remaining: 37 } } } })
    await mountSheet({ topicId: 'pt' })
    expect(document.querySelector('[data-testid="usage-notice"]')).toBeNull()
    expect(document.querySelector('[data-testid="quiz-quota"]')).toBeNull()
  })

  it('no teste: os gates do plano pago (50 questões, o simulado do caderno) e a cota do teste', async () => {
    plan.value = 'free'
    api({ can_quiz: { ok: true } }, { usage: { tier: 'trial', features: { quiz_ai: { used: 1, limit: 3, remaining: 2 } } } })
    await mountSheet({ topicId: 'trf' }, { email_verified: true, trial: { status: 'active', started_at: null, ends_at: null } })
    expect(document.querySelector('[data-testid="quiz-quota"]')?.textContent).toContain('1 de 3 gerações no teste')
    const fifty = [...document.querySelectorAll('option')].find(o => o.textContent?.startsWith('50 questões'))!
    expect((fifty as HTMLOptionElement).disabled).toBe(false)
    tab('Simulado').click()
    await flushPromises()
    expect(document.body.textContent).not.toContain('é do Intensivo')
  })
})
