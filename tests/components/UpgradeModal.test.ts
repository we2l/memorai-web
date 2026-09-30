import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import UpgradeModal from '~/components/ui/UpgradeModal.vue'

const { apiMock } = vi.hoisted(() => ({ apiMock: vi.fn() }))

mockNuxtImport('useNuxtApp', (original) => () => new Proxy(original(), {
  get: (target, key) => (key === '$api' ? apiMock : Reflect.get(target, key)),
}))

const catalog = {
  currency: 'BRL',
  period: 'calendar_month',
  period_timezone: 'America/Sao_Paulo',
  plans: [],
  features: {
    quiz_ai: { label: 'simulados do catálogo', unit: 'por mês', pro_benefit: 'Simulados ilimitados' },
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
    apiMock.mockReset()
    apiMock.mockResolvedValue({ data: catalog })
    document.body.innerHTML = ''
  })

  it('uses the catalog label for the feature key', async () => {
    await mountModal({ feature: 'quiz_ai', used: 1, limit: 1, planRequired: 'pro' })

    expect(apiMock).toHaveBeenCalledWith('/plans')
    expect(document.body.textContent).toContain('Você usou 1 de 1 simulados do catálogo deste mês')
    expect(document.body.textContent).toContain('No Pro: Simulados ilimitados.')
    expect(document.body.textContent).toContain('Ver planos')
  })

  it('has no upgrade CTA when planRequired is null (Pro at the limit)', async () => {
    await mountModal({ feature: 'podcast', used: 5, limit: 5, planRequired: null, resetsAt: '2026-10-01T00:00:00-03:00' })

    expect(document.body.textContent).not.toContain('Ver planos')
    expect(document.body.textContent).toContain('Renova em 01/10.')
    expect(document.body.textContent).toContain('Entendi')
  })
})
