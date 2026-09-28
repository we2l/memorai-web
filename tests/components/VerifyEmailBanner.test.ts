import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { defineComponent, h } from 'vue'
import VerifyEmailBanner from '~/components/ui/VerifyEmailBanner.vue'
import { useAuthStore } from '~/stores/auth'

const { apiMock } = vi.hoisted(() => ({ apiMock: vi.fn() }))

mockNuxtImport('useNuxtApp', (original) => () => new Proxy(original(), {
  get: (target, key) => (key === '$api' ? apiMock : Reflect.get(target, key)),
}))

const baseUser = {
  id: '1',
  name: 'Ana',
  email: 'ana@baigi.com.br',
  plan: 'free',
  default_learning_mode: 'general',
  onboarding_completed: true,
}

// Same condition used in layouts/default.vue
const Host = defineComponent({
  setup() {
    const auth = useAuthStore()
    return () => (auth.user && !auth.isVerified ? h(VerifyEmailBanner) : h('div', 'verified'))
  },
})

describe('VerifyEmailBanner', () => {
  beforeEach(() => {
    // Use the Nuxt app's Pinia so the mounted components see the same store
    useAuthStore().clearAuth()
    apiMock.mockReset()
    sessionStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders only for unverified users', async () => {
    const auth = useAuthStore()
    auth.setUser({ ...baseUser, email_verified: true })
    const verified = await mountSuspended(Host)
    expect(verified.text()).not.toContain('Confirme seu e-mail')

    auth.setUser({ ...baseUser, email_verified: false })
    const unverified = await mountSuspended(Host)
    expect(unverified.find('[role="status"]').text()).toContain('Confirme seu e-mail (ana@baigi.com.br)')
  })

  it('resend calls the endpoint and disables the button for 60 s', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    apiMock.mockResolvedValue({ message: 'ok' })
    useAuthStore().setUser({ ...baseUser, email_verified: false })

    const wrapper = await mountSuspended(VerifyEmailBanner)
    const button = wrapper.find('[role="status"] button')

    await button.trigger('click')
    await vi.waitFor(() => expect(apiMock).toHaveBeenCalledWith('/email/verification-notification', { method: 'POST' }))
    await wrapper.vm.$nextTick()

    expect(button.attributes('disabled')).toBeDefined()
    expect(button.text()).toContain('Reenviar em 60s')

    vi.advanceTimersByTime(60_000)
    await wrapper.vm.$nextTick()
    expect(button.attributes('disabled')).toBeUndefined()
    expect(apiMock).toHaveBeenCalledTimes(1)
  })
})
