import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import OfflineBar from '~/components/shell/OfflineBar.vue'
import { useOfflineStore } from '~/stores/offline'

// QA 2026-11 M3: no answer from the API with the browser online is not "Sem internet", and it offers a retry now
describe('ShellOfflineBar', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    const offline = useOfflineStore()
    offline.markOnline()
    offline.pending = 0
  })

  it('sem conexão no navegador: "Sem internet", sem "Tentar de novo"', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const offline = useOfflineStore()
    offline.markOffline()
    offline.setPending(2)
    const wrapper = await mountSuspended(OfflineBar)
    expect(wrapper.text()).toContain('Sem internet')
    expect(wrapper.find('[data-testid="offline-retry"]').exists()).toBe(false)
  })

  it('servidor inacessível com o navegador online: diz isso e "Tentar de novo" reenvia na hora', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    const offline = useOfflineStore()
    offline.markOffline()
    offline.setPending(1)
    const retry = vi.spyOn(offline, 'retryNow').mockResolvedValue()
    const wrapper = await mountSuspended(OfflineBar)
    expect(wrapper.text()).not.toContain('Sem internet')
    expect(wrapper.get('[data-testid="offline-server"]').text()).toContain('Não conseguimos falar com o servidor')
    expect(wrapper.get('[data-testid="offline-pending"]').text()).toBe('1 avaliação para enviar.')
    await wrapper.get('[data-testid="offline-retry"]').trigger('click')
    await flushPromises()
    expect(retry).toHaveBeenCalledOnce()
  })

  it('a conexão cai depois: volta a ser "Sem internet"', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    const offline = useOfflineStore()
    offline.markOffline()
    offline.setPending(1)
    offline.connectionLost()
    const wrapper = await mountSuspended(OfflineBar)
    expect(wrapper.text()).toContain('Sem internet')
  })
})
