import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import Page from '~/pages/provas/resultado.vue'

const { apiMock } = vi.hoisted(() => ({ apiMock: vi.fn() }))

mockNuxtImport('useNuxtApp', (original) => () => new Proxy(original(), {
  get: (target, key) => (key === '$api' ? apiMock : Reflect.get(target, key)),
}))

const context = { id: 'ex-1', title: 'TJ-SP Escrevente', exam_date: '2026-10-01', outcome: null, topics: [{ id: 't1', name: 'Constitucional' }, { id: 't2', name: 'Penal' }] }

function mockApi(answer: { outcome: string; already_answered: boolean }) {
  apiMock.mockImplementation((url?: string) => String(url ?? '').endsWith('/outcome-public')
    ? Promise.resolve({ data: answer })
    : Promise.resolve({ data: context }))
}

async function mountWith(query: string) {
  const wrapper = await mountSuspended(Page, { route: `/provas/resultado?${query}` })
  await flushPromises()
  return wrapper
}

describe('/provas/resultado', () => {
  beforeEach(() => apiMock.mockReset())

  it('faz o POST no mount com o token e renderiza aprovado', async () => {
    mockApi({ outcome: 'passed', already_answered: false })

    const wrapper = await mountWith('exam=ex-1&outcome=passed&t=tok')

    expect(apiMock).toHaveBeenCalledWith('/exams/ex-1/outcome-public', { method: 'POST', query: { t: 'tok' }, body: { outcome: 'passed' } })
    expect(apiMock).toHaveBeenCalledWith('/exams/ex-1/outcome-context', { query: { t: 'tok' } })
    expect(wrapper.text()).toContain('Parabéns! Você passou em TJ-SP Escrevente')
    expect(wrapper.text()).toContain('E a sua assinatura?')
  })

  it('renderiza pelo outcome retornado, não pelo da query', async () => {
    mockApi({ outcome: 'failed', already_answered: true })

    const wrapper = await mountWith('exam=ex-1&outcome=passed&t=tok')

    expect(wrapper.text()).toContain('Não foi dessa vez, e tudo bem.')
    expect(wrapper.text()).not.toContain('Parabéns')
    expect(wrapper.get('[data-testid="result-already"]').text()).toBe('Você já tinha respondido. Para mudar, use a página Provas.')
    expect(wrapper.text()).toContain('Seus 2 cadernos continuam prontos')
    expect(wrapper.find('a[href*="from%3Dex-1"], a[href*="from=ex-1"]').exists()).toBe(true)
  })

  it('mostra estado expirado no 403', async () => {
    apiMock.mockImplementation((url?: string) => url ? Promise.reject({ response: { status: 403 }, statusCode: 403 }) : Promise.resolve(undefined))

    const wrapper = await mountWith('exam=ex-1&outcome=passed&t=old')

    expect(wrapper.find('[data-testid="result-expired"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Link expirado. Entre no Baigi para registrar o resultado.')
  })

  it('error=expired não chama a API', async () => {
    const wrapper = await mountWith('error=expired')

    expect(apiMock).not.toHaveBeenCalled()
    expect(wrapper.find('[data-testid="result-expired"]').exists()).toBe(true)
  })
})
