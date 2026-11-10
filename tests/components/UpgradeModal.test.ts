import { afterEach, describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount, flushPromises } from '@vue/test-utils'
import UpgradeModal from '~/components/ui/UpgradeModal.vue'

enableAutoUnmount(afterEach)

const { apiMock } = vi.hoisted(() => ({ apiMock: vi.fn() }))

mockNuxtImport('useNuxtApp', (original) => () => new Proxy(original(), {
  get: (target, key) => (key === '$api' ? apiMock : Reflect.get(target, key)),
}))

const catalog = {
  currency: 'BRL',
  period: 'calendar_month',
  period_timezone: 'America/Sao_Paulo',
  plans: [{ key: 'pro', name: 'Intensivo' }],
  features: {
    quiz_ai: { label: 'simulados do catálogo', unit: 'por mês', pro_benefit: '40 simulados por mês' },
    podcast: { label: 'podcasts', unit: 'por mês', pro_benefit: '5 podcasts completos' },
  },
}

async function mountModal(props: Record<string, unknown>) {
  const wrapper = await mountSuspended(UpgradeModal, { props: { modelValue: true, ...props } })
  await flushPromises()
  return wrapper
}

describe('UpgradeModal', () => {
  beforeEach(() => {
    useState('plans').value = null
    useAuthStore().user = null
    apiMock.mockReset()
    apiMock.mockResolvedValue({ data: catalog })
    document.body.innerHTML = ''
  })

  it('prévia grátis esgotada (lifetime): "Você usou a prévia grátis de X" e o convite ao Intensivo, sem data', async () => {
    await mountModal({ feature: 'quiz_ai', used: 1, limit: 1, planRequired: 'pro', resetsAt: null, lifetime: true })
    expect(document.body.textContent).toContain('Você usou a prévia grátis de simulados do catálogo')
    expect(document.body.textContent).toContain('A prévia vale uma vez por conta. No Intensivo, a IA tem cota todo mês: 40 simulados por mês.')
    expect(document.body.textContent).toContain('Ver planos')
    expect(document.body.textContent).not.toContain('recomeça')
  })

  it('uses the catalog label for the feature key', async () => {
    await mountModal({ feature: 'quiz_ai', used: 1, limit: 1, planRequired: 'pro' })

    expect(apiMock).toHaveBeenCalledWith('/plans')
    expect(document.body.textContent).toContain('Você usou 1 de 1 simulados do catálogo deste mês')
    expect(document.body.textContent).toContain('No Intensivo: 40 simulados por mês.')
    expect(document.body.textContent).toContain('Ver planos')
  })

  it('has no upgrade CTA when planRequired is null (Pro at the limit)', async () => {
    await mountModal({ feature: 'podcast', used: 5, limit: 5, planRequired: null, resetsAt: '2026-10-01T00:00:00-03:00' })

    expect(document.body.textContent).not.toContain('Ver planos')
    expect(document.body.textContent).toContain('A contagem recomeça em 01/10.')
    expect(document.body.textContent).toContain('Entendi')
  })

  it('"Ver planos" limpa os toasts: o erro do paywall não segue para /planos', async () => {
    useToast().show('Limite atingido', 'error')
    await mountModal({ feature: 'quiz_ai', used: 1, limit: 1, planRequired: 'pro' })
    const button = [...document.body.querySelectorAll('button')].find(b => b.textContent?.includes('Ver planos'))!
    button.click()
    await flushPromises()
    expect(useToast().state.items).toHaveLength(0)
  })

  it('depois do teste, a IA com limite 0: "Seu teste do Intensivo acabou" e o que fica (prd-planos-lancamento RF-F5)', async () => {
    useAuthStore().user = { plan: 'free', trial: { status: 'used', started_at: '2026-10-01T12:00:00Z', ends_at: '2026-10-08T12:00:00Z' } } as never
    await mountModal({ feature: 'quiz_ai', used: 0, limit: 0, planRequired: 'pro' })
    expect(document.body.textContent).toContain('Seu teste do Intensivo acabou')
    expect(document.body.textContent).toContain('Seus cadernos, notas e cards continuam com você. No Intensivo: 40 simulados por mês.')
  })

  it('"used" sem teste (ex-assinante): o título de sempre, sem falar de teste', async () => {
    useAuthStore().user = { plan: 'free', trial: { status: 'used', started_at: null, ends_at: null } } as never
    await mountModal({ feature: 'quiz_ai', used: 0, limit: 0, planRequired: 'pro' })
    expect(document.body.textContent).toContain('Simulados do catálogo fazem parte do Intensivo')
    expect(document.body.textContent).not.toContain('teste')
  })

  it('no teste, a cota é do teste e não do mês', async () => {
    useAuthStore().user = { plan: 'free', trial: { status: 'active', started_at: '2026-11-05T12:00:00Z', ends_at: '2026-11-12T12:00:00Z' } } as never
    await mountModal({ feature: 'quiz_ai', used: 3, limit: 3, planRequired: 'pro' })
    expect(document.body.textContent).toContain('Você usou 3 de 3 simulados do catálogo do teste')
  })

  it('podcast (fora do teste e do Grátis): a amostra com som, que só baixa no play', async () => {
    useAuthStore().user = { plan: 'free', trial: { status: 'active', started_at: '2026-11-05T12:00:00Z', ends_at: '2026-11-12T12:00:00Z' } } as never
    await mountModal({ feature: 'podcast', used: 0, limit: 0, planRequired: 'pro' })
    // Lazy: the sample comes in its own chunk
    await vi.waitFor(() => expect(document.querySelector('[data-testid="podcast-sample"]')).not.toBeNull())
    const audio = document.querySelector('[data-testid="podcast-sample"] audio')!
    expect(audio.getAttribute('preload')).toBe('none')
    expect(audio.hasAttribute('autoplay')).toBe(false)
    expect(document.querySelectorAll('[data-testid="podcast-sample-lines"] li')).toHaveLength(5)
    expect(document.querySelector('[data-testid="podcast-sample-play"]')?.getAttribute('aria-label')).toBe('Ouvir um exemplo')
    expect(document.body.textContent).toContain('O podcast não entra no teste grátis.')
  })
})
