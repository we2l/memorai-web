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

const generate = () => [...document.querySelectorAll('button')].find(b => b.textContent?.includes('Gerar podcast')) as HTMLButtonElement
const notice = () => document.querySelector('[role="dialog"] p[role="status"]')?.textContent?.trim()

describe('PodcastGenerateSheet (prd-caderno-f1-pontes RF-F5)', () => {
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

  it('na biblioteca: todos os cadernos raiz, inclusive o do Anki sem cards diretos', async () => {
    api({ ok: true })
    useTopicStore().tree = [
      { id: 'anki', name: 'Inglês (Anki)', parent_id: null, flashcards_count: 0, children: [] },
      { id: 'pt', name: 'Português', parent_id: null, flashcards_count: 80, children: [] },
    ] as any
    await mountSuspended(GenerateSheet, { props: { modelValue: true }, attachTo: document.body })
    await flushPromises()
    const options = [...document.querySelectorAll('select option')].map(o => o.textContent?.trim())
    expect(options).toEqual(['Selecione um caderno', 'Inglês (Anki)', 'Português'])
  })
})
