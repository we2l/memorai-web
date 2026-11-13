import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import PublicResult from '~/components/edital/PublicResult.vue'
import { EDITAL_INTENT_KEY } from '~/utils/editalIntent'
import { checkedKey } from '~/utils/publicEdital'

// Resultado da ferramenta pública (prd-edital-verticalizado-publico RF-F3, RF-F5)

const { apiMock, trackMock, navigateToMock, route } = vi.hoisted(() => ({
  apiMock: vi.fn(),
  trackMock: vi.fn(),
  navigateToMock: vi.fn(),
  route: { path: '/x', query: {} as Record<string, string>, params: {}, meta: {}, fullPath: '/x' },
}))

mockNuxtImport('useNuxtApp', original => () => new Proxy(original(), {
  get: (target, key) => (key === '$api' ? apiMock : Reflect.get(target, key)),
}))
mockNuxtImport('useAnalytics', () => () => ({ track: trackMock, identify: vi.fn(), reset: vi.fn() }))
mockNuxtImport('navigateTo', () => navigateToMock)
mockNuxtImport('useRoute', () => () => route)

enableAutoUnmount(afterEach)
const tick = async () => { await flushPromises(); await nextTick(); await new Promise(r => setTimeout(r, 0)) }

const ID = '01JD0000000000000000000ABC'
const READING = {
  id: ID,
  status: 'ready' as const,
  proposal: {
    name: 'PM-PE 2026 · Soldado',
    exam_date: null,
    subjects: [
      { name: 'Português', topics: [{ name: 'Crase', description: '1 Crase <b>x</b>' }, { name: 'Pontuação', description: null }] },
      { name: 'Direito', topics: [{ name: 'Crimes', description: null }] },
    ],
  },
}

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

beforeEach(() => {
  vi.stubGlobal('localStorage', memoryStorage())
  apiMock.mockReset()
  trackMock.mockReset()
  navigateToMock.mockReset()
  route.query = {}
  useAuthStore().user = null
  document.body.innerHTML = ''
})

const mount = () => mountSuspended(PublicResult, { props: { reading: READING }, attachTo: document.body })
const byId = (id: string) => document.querySelector<HTMLElement>(`[data-testid="${id}"]`)!

describe('EditalPublicResult', () => {
  it('mostra os totais, marca, guarda no aparelho e manda o evento uma vez só', async () => {
    await mount()
    expect(byId('edital-result-counts').textContent).toContain('2 matérias · 3 assuntos')
    expect(byId('edital-result-exam')).toBeNull()
    expect(document.body.textContent).toContain('0 de 3 estudados')
    byId('edital-topic-0-0').click()
    await tick()
    byId('edital-topic-1-0').click()
    await tick()
    expect(document.body.textContent).toContain('2 de 3 estudados')
    expect(JSON.parse(localStorage.getItem(checkedKey(ID))!)).toEqual(['0.0', '1.0'])
    expect(trackMock.mock.calls.filter(c => c[0] === 'edital_public_check')).toEqual([['edital_public_check', { pct_bucket: '26-50' }]])
  })

  it('lê o que já estava marcado e mostra o item do edital como texto, nunca como HTML', async () => {
    localStorage.setItem(checkedKey(ID), JSON.stringify(['0.1']))
    await mount()
    expect(document.body.textContent).toContain('1 de 3 estudados')
    const item = document.querySelector('details p')!
    expect(item.textContent).toBe('1 Crase <b>x</b>')
    expect(item.querySelector('b')).toBeNull()
  })

  it('sem conta: guarda a intenção e vai ao cadastro', async () => {
    await mount()
    byId('edital-apply').click()
    await tick()
    expect(localStorage.getItem(EDITAL_INTENT_KEY)).toBe(ID)
    expect(navigateToMock).toHaveBeenCalledWith('/criar-conta')
    expect(apiMock).not.toHaveBeenCalled()
    expect(trackMock).toHaveBeenCalledWith('edital_public_apply_clicked', { logged_in: false })
  })

  it('logada: cria o caderno, limpa a intenção e abre o hub', async () => {
    useAuthStore().user = { id: 'u1', name: 'Ana', email: 'a@x.com', plan: 'free', onboarding_completed: true } as any
    localStorage.setItem(EDITAL_INTENT_KEY, ID)
    apiMock.mockResolvedValue({ data: { topic: { id: 't9', name: 'PM-PE' }, counts: { subjects: 2, topics: 3 }, exam: null, exam_skipped: null } })
    await mount()
    byId('edital-apply').click()
    await tick()
    expect(apiMock).toHaveBeenCalledWith(`/editais/publicos/${ID}/apply`, { method: 'POST', body: {} })
    expect(localStorage.getItem(EDITAL_INTENT_KEY)).toBeNull()
    expect(navigateToMock).toHaveBeenCalledWith('/cadernos/t9')
    expect(trackMock).toHaveBeenCalledWith('edital_public_applied', {})
  })

  it('volta do cadastro com a intenção desta leitura: aplica sozinha, uma vez', async () => {
    useAuthStore().user = { id: 'u1', name: 'Ana', email: 'a@x.com', plan: 'free', onboarding_completed: true } as any
    localStorage.setItem(EDITAL_INTENT_KEY, ID)
    route.query = { aplicar: '1' }
    apiMock.mockResolvedValue({ data: { topic: { id: 't9', name: 'PM-PE' }, counts: { subjects: 2, topics: 3 }, exam: null, exam_skipped: null } })
    await mount()
    await tick()
    expect(apiMock.mock.calls.filter(c => String(c[0]).includes('/apply'))).toHaveLength(1)
    expect(navigateToMock).toHaveBeenCalledWith('/cadernos/t9')
  })

  it('?aplicar=1 sem a intenção desta leitura não cria nada', async () => {
    useAuthStore().user = { id: 'u1', name: 'Ana', email: 'a@x.com', plan: 'free', onboarding_completed: true } as any
    route.query = { aplicar: '1' }
    await mount()
    await tick()
    expect(apiMock).not.toHaveBeenCalled()
  })

  it('409 caderno_name_taken: oferece abrir o existente ou criar outro', async () => {
    useAuthStore().user = { id: 'u1', name: 'Ana', email: 'a@x.com', plan: 'free', onboarding_completed: true } as any
    apiMock.mockRejectedValueOnce(Object.assign(new Error('409'), { status: 409, data: { code: 'caderno_name_taken', topic: { id: 't1', name: 'PM-PE 2026 · Soldado' } } }))
    await mount()
    byId('edital-apply').click()
    await tick()
    expect(byId('edital-name-taken').textContent).toContain('Já existe um caderno com esse nome')
    expect(byId('edital-create-anyway')).not.toBeNull()
    expect(navigateToMock).not.toHaveBeenCalled()
  })
})
