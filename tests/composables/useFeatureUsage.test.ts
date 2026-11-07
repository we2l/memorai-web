import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { effectScope, nextTick } from 'vue'

const { apiMock } = vi.hoisted(() => ({ apiMock: vi.fn() }))
mockNuxtImport('useNuxtApp', original => () => new Proxy(original(), {
  get: (target, key) => (key === '$api' ? apiMock : Reflect.get(target, key)),
}))

const freeUsage = { plan: 'free', tier: 'free', period_start: '2026-11-01', period_end: '2026-11-30', features: { agent_chat: { used: 0, limit: 0, remaining: 0 }, podcast: { used: 0, limit: 0, remaining: 0 } } }
const trial = (status: 'available' | 'active' | 'used') => ({ status, started_at: status === 'available' ? null : '2026-11-05T12:00:00Z', ends_at: status === 'available' ? null : '2026-11-12T12:00:00Z' })

// Each composable in its own scope, stopped after the test: no watcher left behind for the next one
const scopes: ReturnType<typeof effectScope>[] = []
function featureUsage() {
  const scope = effectScope()
  scopes.push(scope)
  return scope.run(() => useFeatureUsage())!
}
afterEach(() => { scopes.splice(0).forEach(s => s.stop()) })

describe('useFeatureUsage: o Grátis com o teste disponível não é bloqueado no cliente (prd-planos-lancamento RF-F7b)', () => {
  beforeEach(() => {
    apiMock.mockReset()
    useState('plans').value = null
  })

  it('cota 0 + teste disponível + e-mail confirmado: o clique segue (menos o podcast, fora do teste)', async () => {
    useAuthStore().user = { id: 'u', plan: 'free', email_verified: true, trial: trial('available') } as any
    apiMock.mockResolvedValue({ data: freeUsage })
    const usage = featureUsage()
    await usage.fetchUsage()
    expect(usage.canUse('agent_chat')).toBe(true)
    expect(usage.opensTrial('agent_chat')).toBe(true)
    expect(usage.canUse('podcast')).toBe(false)
  })

  it('sem e-mail confirmado ou depois do teste: a cota 0 bloqueia', async () => {
    apiMock.mockResolvedValue({ data: freeUsage })
    useAuthStore().user = { id: 'u', plan: 'free', email_verified: false, trial: trial('available') } as any
    const unverified = featureUsage()
    await unverified.fetchUsage()
    expect(unverified.canUse('agent_chat')).toBe(false)
    useAuthStore().user = { id: 'u', plan: 'free', email_verified: true, trial: trial('used') } as any
    expect(unverified.canUse('agent_chat')).toBe(false)
  })

  it('o teste abriu sob a tela: /usage de novo, e a contagem passa a ser "no teste"', async () => {
    useAuthStore().user = { id: 'u', plan: 'free', email_verified: true, trial: trial('available') } as any
    apiMock.mockResolvedValueOnce({ data: freeUsage })
    const usage = featureUsage()
    await usage.fetchUsage()
    expect(usage.periodLabel.value).toBe('este mês')
    apiMock.mockResolvedValueOnce({ data: { ...freeUsage, tier: 'trial', features: { agent_chat: { used: 1, limit: 30, remaining: 29 } } } })
    useAuthStore().user = { ...useAuthStore().user!, trial: trial('active') }
    await nextTick()
    await flushPromises()
    expect(apiMock).toHaveBeenCalledTimes(2)
    expect(usage.periodLabel.value).toBe('no teste')
    expect(usage.remaining('agent_chat')).toBe(29)
  })
})

describe('auth.refreshTrialAfterUse', () => {
  it('lê /me uma vez por vez enquanto o teste está disponível; depois, nunca mais', async () => {
    const auth = useAuthStore()
    auth.user = { id: 'u', plan: 'free', email_verified: true, trial: trial('available') } as any
    let resolve!: (v: unknown) => void
    apiMock.mockReset()
    apiMock.mockImplementation((url: string) => (url === '/me' ? new Promise((r) => { resolve = r }) : Promise.resolve({ data: null })))
    const meCalls = () => apiMock.mock.calls.filter(c => c[0] === '/me').length
    void auth.refreshTrialAfterUse()
    void auth.refreshTrialAfterUse()
    expect(meCalls()).toBe(1)
    resolve({ data: { ...auth.user, trial: trial('active') } })
    await flushPromises()
    expect(auth.onTrial).toBe(true)
    void auth.refreshTrialAfterUse()
    expect(meCalls()).toBe(1)
  })
})

describe('useFeatureUsage: o Intensivo perto e no limite (prd-uso-justo RF-F3)', () => {
  beforeEach(() => {
    apiMock.mockReset()
    useState('plans').value = { plans: [], features: { agent_chat: { label: 'perguntas ao tira-dúvidas', unit: 'por mês', pro_benefit: '' } } }
  })

  it('Grátis e teste: nenhum GET a mais, nenhuma linha, e o 402 local segue para o upgrade', async () => {
    useAuthStore().user = { id: 'u', plan: 'free', email_verified: true, trial: trial('active') } as any
    const usage = featureUsage()
    await usage.fetchUsageIfPaid()
    expect(apiMock).not.toHaveBeenCalled()
    apiMock.mockResolvedValue({ data: { ...freeUsage, tier: 'trial', features: { agent_chat: { used: 30, limit: 30, remaining: 0 } } } })
    await usage.fetchUsage()
    expect(usage.notice('agent_chat')).toBeNull()
    expect(usage.atLimit('agent_chat')).toBe(false)
    expect(usage.limitDetail('agent_chat').planRequired).toBe('pro')
  })

  it('Intensivo: a linha dos 80%, o limite com a data, a conta local e o 402 local sem upgrade', async () => {
    useAuthStore().user = { id: 'u', plan: 'pro' } as any
    apiMock.mockResolvedValue({ data: { plan: 'pro', tier: 'pro', period_start: '2026-11-01', period_end: '2026-11-30', resets_at: '2026-12-01T00:00:00-03:00', features: { agent_chat: { used: 698, limit: 700, remaining: 2 } } } })
    const usage = featureUsage()
    await usage.fetchUsageIfPaid()
    expect(apiMock).toHaveBeenCalledWith('/usage')
    expect(usage.notice('agent_chat')?.text).toBe('Restam 2 de 700 perguntas ao tira-dúvidas este mês.')
    usage.countUse('agent_chat')
    usage.countUse('agent_chat')
    expect(usage.atLimit('agent_chat')).toBe(true)
    expect(usage.notice('agent_chat')?.text).toBe('Você usou 700 de 700 perguntas ao tira-dúvidas deste mês. A contagem recomeça em 01/12.')
    expect(usage.limitDetail('agent_chat')).toEqual({ feature: 'agent_chat', used: 700, limit: 700, planRequired: null, resetsAt: '2026-12-01T00:00:00-03:00' })
  })
})
