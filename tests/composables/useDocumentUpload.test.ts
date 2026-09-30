import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { setActivePinia, createPinia } from 'pinia'
import { useDocumentUpload } from '~/composables/useDocumentUpload'
import { useToast } from '~/composables/useToast'

const { apiMock, track } = vi.hoisted(() => ({ apiMock: vi.fn(), track: vi.fn() }))
mockNuxtImport('useAnalytics', () => () => ({ track, identify: vi.fn(), reset: vi.fn() }))
mockNuxtImport('useNuxtApp', original => () => new Proxy(original(), {
  get: (target, key) => (key === '$api' ? apiMock : Reflect.get(target, key)),
}))

const catalog = {
  data: {
    features: {},
    plans: [
      { key: 'free', name: 'Grátis', prices: { monthly: null, annual: null }, limits: {}, extras: { upload_max_mb: 5 } },
      { key: 'pro', name: 'Pro', prices: { monthly: null, annual: null }, limits: {}, extras: { upload_max_mb: 100 } },
    ],
  },
}

function pdf(sizeMb: number, name = 'apostila.pdf') {
  const file = new File(['x'], name, { type: 'application/pdf' })
  Object.defineProperty(file, 'size', { value: sizeMb * 1024 * 1024 })
  return file
}

describe('useDocumentUpload', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    apiMock.mockReset().mockImplementation(async (url: string) => {
      if (url === '/plans') return catalog
      throw new Error(`unexpected ${url}`)
    })
    useState('plans').value = null
    const t = useToast()
    for (const i of [...t.state.items]) t.dismiss(i.id)
  })

  it('recusa PDF acima do limite do plano (de /api/plans) sem enviar nada', async () => {
    const xhrOpen = vi.spyOn(XMLHttpRequest.prototype, 'open')
    const { upload } = useDocumentUpload()
    const result = await upload(pdf(6), { autoCards: true })
    expect(result).toBeNull()
    expect(xhrOpen).not.toHaveBeenCalled()
    expect(useToast().state.items[0]?.message).toContain('5 MB')
    xhrOpen.mockRestore()
  })

  it('recusa arquivo que não é PDF', async () => {
    const { validate } = useDocumentUpload()
    expect(await validate(new File(['x'], 'nota.txt', { type: 'text/plain' }))).toBe('Envie um arquivo PDF.')
  })

  it('aceita PDF dentro do limite', async () => {
    const { validate } = useDocumentUpload()
    expect(await validate(pdf(4))).toBeNull()
  })

  it('emite pdf_upload_started com size_mb de 1 casa e a origem, antes do envio', async () => {
    track.mockClear()
    const send = vi.spyOn(XMLHttpRequest.prototype, 'send').mockImplementation(function (this: XMLHttpRequest) {
      Object.defineProperty(this, 'status', { value: 500 })
      Object.defineProperty(this, 'responseText', { value: '{}' })
      this.onload?.(new ProgressEvent('load'))
    })
    const { upload } = useDocumentUpload()
    await upload(pdf(2.345), { source: 'onboarding' })
    expect(track).toHaveBeenCalledWith('pdf_upload_started', { size_mb: 2.3, source: 'onboarding' })
    send.mockRestore()
  })
})
