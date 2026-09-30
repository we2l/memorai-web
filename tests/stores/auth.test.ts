import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '~/stores/auth'
import type { User } from '~/types'

const user: User = {
  id: '1',
  name: 'Test',
  email: 'test@test.com',
  email_verified: false,
  plan: 'free',
  default_learning_mode: 'general',
  onboarding_completed: true,
}

const { analyticsMock } = vi.hoisted(() => ({
  analyticsMock: { track: vi.fn(), identify: vi.fn(), reset: vi.fn() },
}))
mockNuxtImport('useAnalytics', () => () => analyticsMock)

describe('useAuthStore', () => {
  beforeEach(() => {
    Object.values(analyticsMock).forEach(f => f.mockClear())
    setActivePinia(createPinia())
    document.cookie = 'baigi_logged_in=; path=/; max-age=0'
  })

  it('starts without user', () => {
    const auth = useAuthStore()
    expect(auth.user).toBeNull()
    expect(auth.isAuthenticated).toBe(false)
    expect(auth.loaded).toBe(false)
  })

  it('setUser authenticates and sets the logged-in hint cookie', () => {
    const auth = useAuthStore()
    auth.setUser(user)
    expect(auth.isAuthenticated).toBe(true)
    expect(document.cookie).toContain('baigi_logged_in=1')
  })

  it('clearAuth resets state and the hint cookie', () => {
    const auth = useAuthStore()
    auth.setUser(user)
    auth.clearAuth()
    expect(auth.isAuthenticated).toBe(false)
    expect(auth.user).toBeNull()
    expect(document.cookie).not.toContain('baigi_logged_in=1')
  })

  it('isVerified follows email_verified', () => {
    const auth = useAuthStore()
    auth.setUser(user)
    expect(auth.isVerified).toBe(false)
    auth.setUser({ ...user, email_verified: true })
    expect(auth.isVerified).toBe(true)
  })

  it('no longer exposes a token', () => {
    const auth = useAuthStore() as any
    expect(auth.token).toBeUndefined()
    expect(auth.setAuth).toBeUndefined()
    expect(auth.loadFromCookie).toBeUndefined()
  })

  it('setUser identifica no analytics (o composable só repassa id + plan)', () => {
    const auth = useAuthStore()
    auth.setUser(user)
    expect(analyticsMock.identify).toHaveBeenCalledWith(user)
  })

  it('clearAuth (logout) reseta o analytics', () => {
    const auth = useAuthStore()
    auth.setUser(user)
    auth.clearAuth()
    expect(analyticsMock.reset).toHaveBeenCalledTimes(1)
  })
})
