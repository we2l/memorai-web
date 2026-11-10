import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { requireNetwork } from '~/utils/requireNetwork'
import { useOfflineStore } from '~/stores/offline'

// IA offline (prd-revisao-offline RF-F7): says it needs the network instead of opening what can only fail
const { toastShow } = vi.hoisted(() => ({ toastShow: vi.fn() }))
mockNuxtImport('useToast', () => () => ({ show: toastShow, toasts: { value: [] }, dismiss: vi.fn() }))

describe('requireNetwork', () => {
  beforeEach(() => { setActivePinia(createPinia()); toastShow.mockReset() })

  it('com rede segue sem aviso', () => {
    expect(requireNetwork()).toBe(true)
    expect(toastShow).not.toHaveBeenCalled()
  })

  it('sem rede avisa e barra', () => {
    useOfflineStore().markOffline()
    expect(requireNetwork()).toBe(false)
    expect(toastShow).toHaveBeenCalledWith('Isso precisa de internet. Sua revisão continua.', 'info')
  })
})
