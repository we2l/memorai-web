import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount, flushPromises } from '@vue/test-utils'
import GenerateSheet from '~/components/podcast/GenerateSheet.vue'

const { apiMock, toastShow } = vi.hoisted(() => ({ apiMock: vi.fn(), toastShow: vi.fn() }))
mockNuxtImport('useNuxtApp', original => () => new Proxy(original(), {
  get: (target, key) => (key === '$api' ? apiMock : Reflect.get(target, key)),
}))
mockNuxtImport('useToast', () => () => ({ show: toastShow, toasts: { value: [] }, dismiss: vi.fn() }))

enableAutoUnmount(afterEach)
afterEach(() => { document.body.innerHTML = '' })

const needsReviews = { ok: false, code: 'needs_reviewed_cards', requirement: { required: 5, current: 2 } }

function api(canPodcast: unknown, create?: () => Promise<unknown>) {
  apiMock.mockImplementation((url: string, opts?: { method?: string }) => {
    if (url.endsWith('/details')) return Promise.resolve({ data: { id: url.split('/')[2], weak_count: 3, can_podcast: canPodcast } })
    if (url === '/podcasts' && opts?.method === 'POST') return create ? create() : Promise.resolve({ data: { id: 'p1', status: 'pending' } })
    return Promise.resolve({ data: [] })
  })
}

const generate = () => [...document.querySelectorAll('button')].find(b => b.textContent?.includes('Gerar episódio')) as HTMLButtonElement
const notice = () => document.querySelector('[role="dialog"] p[role="status"]')?.textContent?.trim()

describe('PodcastGenerateSheet (prd-caderno-f1-pontes RF-F5, prd-4e-praticar-v3 RF-F9)', () => {
  beforeEach(() => {
    apiMock.mockReset()
    toastShow.mockReset()
  })

  it('no caderno: o requisito aparece antes e o botão espera', async () => {
    api(needsReviews)
    await mountSuspended(GenerateSheet, { props: { modelValue: true, topicId: 't1' }, attachTo: document.body })
    await flushPromises()
    expect(apiMock).toHaveBeenCalledWith('/topics/t1/details')
    expect(notice()).toBe('Revise 5 cards para liberar · faltam 3')
    expect(generate().disabled).toBe(true)
  })

  it('422 com code no POST vira o mesmo texto, sem toast cru', async () => {
    const err = Object.assign(new Error('422'), { status: 422, data: { message: 'x', code: 'needs_cards', requirement: { required: 1, current: 0 } } })
    api({ ok: true }, () => Promise.reject(err))
    await mountSuspended(GenerateSheet, { props: { modelValue: true, topicId: 't1' }, attachTo: document.body })
    await flushPromises()
    generate().click()
    await flushPromises()
    expect(notice()).toBe('Crie cards e faça 5 revisões para liberar')
    expect(toastShow).not.toHaveBeenCalled()
  })

  it('na biblioteca: a árvore inteira (caderno, matéria, assunto), inclusive o do Anki sem cards diretos', async () => {
    api({ ok: true })
    useTopicStore().tree = [
      { id: 'anki', name: 'Inglês (Anki)', parent_id: null, flashcards_count: 0, children: [{ id: 'voc', name: 'Vocabulary', parent_id: 'anki', flashcards_count: 9, children: [] }] },
      { id: 'pt', name: 'Português', parent_id: null, flashcards_count: 80, children: [] },
    ] as any
    await mountSuspended(GenerateSheet, { props: { modelValue: true }, attachTo: document.body })
    await flushPromises()
    const options = [...document.querySelectorAll('select option')].map(o => o.textContent?.trim())
    expect(options).toEqual(['Escolha o caderno ou o assunto', 'Inglês (Anki)', '— Vocabulary', 'Português'])
  })

  it('o episódio é sempre o curto: o tempo do catálogo e a cota antes, e o POST manda short (prd-planos-lancamento RF-B15)', async () => {
    apiMock.mockImplementation((url: string, opts?: { method?: string }) => {
      if (url.endsWith('/details')) return Promise.resolve({ data: { weak_count: 8, can_podcast: { ok: true } } })
      if (url === '/usage') return Promise.resolve({ data: { features: { podcast: { used: 3, limit: 5, remaining: 2 } } } })
      if (url === '/plans') return Promise.resolve({ data: { plans: [{ key: 'pro', name: 'Intensivo', extras: { podcast_max_minutes: 8 } }], features: {} } })
      if (url === '/podcasts' && opts?.method === 'POST') return Promise.resolve({ data: { id: 'p1', status: 'pending' } })
      return Promise.resolve({ data: [] })
    })
    useState('plans').value = null
    useAuthStore().user = { id: 'u', plan: 'pro', name: 'Ana' } as any
    await mountSuspended(GenerateSheet, { props: { modelValue: true, topicId: 't1' }, attachTo: document.body })
    await flushPromises()
    expect(document.body.textContent).not.toContain('Duração')
    expect(document.querySelector('[data-testid="podcast-quota"]')?.textContent?.replace(/\s+/g, ' ').trim()).toBe('Até 8 min · pronto em ~4 min · 3 de 5 este mês')
    generate().click()
    await flushPromises()
    expect(apiMock).toHaveBeenCalledWith('/podcasts', expect.objectContaining({ method: 'POST', body: expect.objectContaining({ duration: 'short' }) }))
    useAuthStore().user = null
    useState('plans').value = null
  })

  it('fora do plano pago (Grátis e teste): o vídeo de demonstração no lugar do formulário, sem pedir /details (RF-F3)', async () => {
    api({ ok: true })
    useAuthStore().user = { id: 'u', plan: 'free', name: 'Ana', trial: { status: 'active', started_at: null, ends_at: null } } as any
    await mountSuspended(GenerateSheet, { props: { modelValue: true, topicId: 't1' }, attachTo: document.body })
    await flushPromises()
    expect(document.querySelector('[data-testid="podcast-paywall"]')).not.toBeNull()
    expect(document.querySelector('video')?.getAttribute('preload')).toBe('none')
    expect(document.body.textContent).toContain('O podcast não entra no teste grátis.')
    expect(document.querySelector('[data-testid="podcast-scope"]')).toBeNull()
    expect(apiMock).not.toHaveBeenCalledWith('/topics/t1/details')
    const plans = document.querySelector('[data-testid="podcast-paywall-plans"]')!
    expect(plans.textContent).toContain('Conhecer o Intensivo')
    expect(plans.getAttribute('href')).toBe('/planos')
    useAuthStore().user = null
  })
})
