import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { requireNetwork } from '~/utils/requireNetwork'
import { useOfflineStore } from '~/stores/offline'

// IA offline (prd-revisao-offline RF-F7): says it needs the network instead of opening what can only fail
const { toastShow } = vi.hoisted(() => ({ toastShow: vi.fn() }))
mockNuxtImport('useToast', () => () => ({ show: toastShow, toasts: { value: [] }, dismiss: vi.fn() }))

describe('requireNetwork', () => {
  beforeEach(() => { setActivePinia(createPinia()); toastShow.mockReset(); vi.restoreAllMocks() })

  it('com rede segue sem aviso', () => {
    expect(requireNetwork()).toBe(true)
    expect(toastShow).not.toHaveBeenCalled()
  })

  it('sem rede avisa e barra', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    useOfflineStore().markOffline()
    expect(requireNetwork()).toBe(false)
    expect(toastShow).toHaveBeenCalledWith('Isso precisa de internet. Sua revisão continua.', 'info')
  })

  it('servidor que não responde com o navegador online: não diz "sem internet" (QA M3)', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    useOfflineStore().markOffline()
    expect(requireNetwork()).toBe(false)
    expect(toastShow).toHaveBeenCalledWith('Isso precisa do servidor, que não respondeu agora. Sua revisão continua.', 'info')
  })
})
