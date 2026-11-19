import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import GoogleButton from '~/components/auth/GoogleButton.vue'

const { apiMock } = vi.hoisted(() => ({ apiMock: vi.fn() }))

mockNuxtImport('useNuxtApp', (original) => () => new Proxy(original(), {
  get: (target, key) => (key === '$api' ? apiMock : Reflect.get(target, key)),
}))
mockNuxtImport('ensureCsrfCookie', () => () => Promise.resolve())

function pageShow(persisted: boolean) {
  const event = new Event('pageshow') as PageTransitionEvent
  Object.defineProperty(event, 'persisted', { value: persisted })
  window.dispatchEvent(event)
}

describe('AuthGoogleButton', () => {
  beforeEach(() => {
    apiMock.mockReset()
    // The href setter would navigate jsdom away; the URL never arrives, as in the instant before Safari leaves
    apiMock.mockReturnValue(new Promise(() => {}))
  })

  it('Voltar from Google (page restored from the back-forward cache) frees the button', async () => {
    const wrapper = await mountSuspended(GoogleButton)
    const button = wrapper.get('[data-testid=google-button]')
    await button.trigger('click')
    expect(button.text()).toContain('Abrindo o Google…')
    expect(button.attributes('aria-busy')).toBe('true')

    pageShow(true)
    await wrapper.vm.$nextTick()
    expect(button.text()).toContain('Continuar com Google')
    expect(button.attributes('aria-busy')).toBeUndefined()

    await button.trigger('click')
    expect(apiMock).toHaveBeenCalledTimes(2)
  })

  it('a normal page load (pageshow not persisted) does not touch a click in progress', async () => {
    const wrapper = await mountSuspended(GoogleButton)
    const button = wrapper.get('[data-testid=google-button]')
    await button.trigger('click')
    pageShow(false)
    await wrapper.vm.$nextTick()
    expect(button.text()).toContain('Abrindo o Google…')
  })
})
