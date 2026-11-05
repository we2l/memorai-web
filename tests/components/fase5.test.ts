import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount, flushPromises } from '@vue/test-utils'
import GenerateNoteSheet from '~/components/topic/GenerateNoteSheet.vue'
import MindMapView from '~/components/topic/MindMapView.vue'
import ConfirmModal from '~/components/ui/ConfirmModal.vue'
import PlanBadge from '~/components/ui/PlanBadge.vue'

const { apiMock } = vi.hoisted(() => ({ apiMock: vi.fn() }))
mockNuxtImport('useNuxtApp', original => () => new Proxy(original(), {
  get: (target, key) => (key === '$api' ? apiMock : Reflect.get(target, key)),
}))

enableAutoUnmount(afterEach)
afterEach(() => { document.body.innerHTML = '' })
beforeEach(() => { apiMock.mockReset(); useState('plans').value = null })

const plan = (key: string, pages: number) => ({ key, name: key, prices: { monthly: null, annual: null }, limits: {}, extras: { pdf_pages_per_note: pages } })

describe('GenerateNoteSheet: o limite de páginas vem do catálogo', () => {
  const doc = { id: 'd', original_name: 'apostila.pdf', pages_count: 150 }

  beforeEach(() => {
    apiMock.mockImplementation((url: string) => (url === '/plans'
      ? Promise.resolve({ data: { plans: [plan('free', 120), plan('pro', 500)], features: {} } })
      : Promise.resolve({ data: { features: { pdf_to_note: { limit: 1, used: 0, remaining: 1 } } } })))
  })

  it('Free com PDF maior que o limite: o número do catálogo', async () => {
    useAuthStore().user = { plan: 'free' } as never
    const w = await mountSuspended(GenerateNoteSheet, { props: { document: doc as never, modelValue: false }, attachTo: document.body })
    await w.setProps({ modelValue: true })
    await flushPromises()
    expect(document.body.textContent).toContain('as primeiras 120')
  })

  it('Pro dentro do limite: sem aviso de parte', async () => {
    useAuthStore().user = { plan: 'pro' } as never
    const w = await mountSuspended(GenerateNoteSheet, { props: { document: doc as never, modelValue: false }, attachTo: document.body })
    await w.setProps({ modelValue: true })
    await flushPromises()
    expect(document.body.textContent).not.toContain('Serão processadas')
  })
})

describe('MindMapView', () => {
  it('poucas notas: um convite com primário, sem mapa', async () => {
    useAuthStore().user = { plan: 'free' } as never
    apiMock.mockResolvedValue({ data: null, meta: { min_notes_required: true, total_notes: 1 } })
    const w = await mountSuspended(MindMapView, { props: { topicId: 't' } })
    await flushPromises()
    expect(w.text()).toContain('Adicione pelo menos 3 notas')
    expect(w.findAll('button').find(b => b.text() === 'Criar nota')).toBeTruthy()
  })

  it('Pro: abas Automático e Detalhado, e o detalhado sem mapa oferece gerar', async () => {
    useAuthStore().user = { plan: 'pro' } as never
    apiMock.mockImplementation((url: string) => Promise.resolve(url.endsWith('/ai')
      ? { data: null, meta: { exists: false } }
      : { data: { content: 'Raiz', children: [] }, meta: { total_notes: 8 } }))
    const w = await mountSuspended(MindMapView, { props: { topicId: 't' } })
    await flushPromises()
    const tabs = w.findAll('[role="tab"]')
    expect(tabs.map(t => t.text())).toEqual(['Automático', 'Detalhado (IA)'])
    await tabs[1]!.trigger('click')
    expect(w.text()).toContain('Gerar mapa detalhado')
  })
})

describe('UiConfirmModal sobre UiDialog', () => {
  it('role alertdialog com título e descrição; o nome digitado libera a ação', async () => {
    const w = await mountSuspended(ConfirmModal, { props: { modelValue: true, title: 'Apagar agora?', message: 'Não dá para desfazer.', confirmLabel: 'Apagar', requireText: 'TRF' }, attachTo: document.body })
    await flushPromises()
    const dialog = document.querySelector('[role="alertdialog"]')!
    expect(document.getElementById(dialog.getAttribute('aria-labelledby')!)?.textContent).toBe('Apagar agora?')
    expect(document.getElementById(dialog.getAttribute('aria-describedby')!)?.textContent).toBe('Não dá para desfazer.')
    const confirm = [...dialog.querySelectorAll('button')].find(b => b.textContent?.includes('Apagar'))!
    expect(confirm.getAttribute('aria-disabled') === 'true' || confirm.hasAttribute('disabled')).toBe(true)
    const input = dialog.querySelector('input')!
    input.value = 'TRF'
    input.dispatchEvent(new Event('input'))
    await flushPromises()
    expect(confirm.getAttribute('aria-disabled') === 'true' || confirm.hasAttribute('disabled')).toBe(false)
    w.unmount()
  })
})

describe('UiPlanBadge', () => {
  it('só tokens v3', async () => {
    const free = await mountSuspended(PlanBadge, { props: { plan: 'free' } })
    expect(free.html()).toContain('bg-subtle')
    const pro = await mountSuspended(PlanBadge, { props: { plan: 'pro' } })
    expect(pro.html()).toContain('bg-action-subtle')
  })
})
