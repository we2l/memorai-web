import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import Page from '~/pages/lembretes/desativado.vue'

const { apiMock } = vi.hoisted(() => ({ apiMock: vi.fn() }))

mockNuxtImport('useNuxtApp', (original) => () => new Proxy(original(), {
  get: (target, key) => (key === '$api' ? apiMock : Reflect.get(target, key)),
}))

// Same source as nuxt.config (public.apiBase): the page only POSTs to URLs under it
const apiBase = (process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:8037/api').replace(/\/$/, '')
const unsubscribeUrl = `${apiBase}/email/unsubscribe/u-1?signature=abc`
const resubscribeUrl = `${apiBase}/email/resubscribe/u-1?expires=1&signature=def`

async function mountWith(u: string) {
  const wrapper = await mountSuspended(Page, { route: `/lembretes/desativado?u=${encodeURIComponent(u)}` })
  await flushPromises()
  return wrapper
}

describe('/lembretes/desativado', () => {
  beforeEach(() => apiMock.mockReset())

  it('faz o POST na URL assinada ao montar e mostra o sucesso', async () => {
    apiMock.mockResolvedValueOnce({ data: { reminder_enabled: false, resubscribe_url: resubscribeUrl } })

    const wrapper = await mountWith(unsubscribeUrl)

    expect(apiMock).toHaveBeenCalledTimes(1)
    expect(apiMock).toHaveBeenCalledWith(unsubscribeUrl, { method: 'POST' })
    expect(wrapper.text()).toContain('Lembretes desativados')
    expect(wrapper.text()).toContain('Reativar lembretes')
  })

  it('mostra link inválido no 403', async () => {
    apiMock.mockRejectedValueOnce({ response: { status: 403 }, statusCode: 403 })

    const wrapper = await mountWith(unsubscribeUrl)

    expect(wrapper.text()).toContain('Link inválido. Desative em Configurações.')
  })

  it('não faz POST para URL fora da API', async () => {
    const wrapper = await mountWith('https://evil.test/email/unsubscribe/u-1')

    expect(apiMock).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Link inválido')
  })

  it('reativar chama a URL retornada', async () => {
    apiMock
      .mockResolvedValueOnce({ data: { reminder_enabled: false, resubscribe_url: resubscribeUrl } })
      .mockResolvedValueOnce({ data: { reminder_enabled: true, reminder_hour: 19 } })

    const wrapper = await mountWith(unsubscribeUrl)
    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(apiMock).toHaveBeenLastCalledWith(resubscribeUrl, { method: 'POST' })
    expect(wrapper.text()).toContain('Pronto, lembretes reativados às 19h.')
  })
})
