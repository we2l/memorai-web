import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '~/stores/auth'

describe('useAuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('starts unauthenticated', () => {
    const auth = useAuthStore()
    expect(auth.isAuthenticated).toBe(false)
    expect(auth.user).toBeNull()
    expect(auth.token).toBeNull()
  })

  it('setAuth sets user and token', () => {
    const auth = useAuthStore()
    auth.setAuth({ id: '1', name: 'Test', email: 'test@test.com', plan: 'free' }, 'abc123')
    expect(auth.isAuthenticated).toBe(true)
    expect(auth.user?.name).toBe('Test')
    expect(auth.token).toBe('abc123')
  })

  it('clearAuth resets state', () => {
    const auth = useAuthStore()
    auth.setAuth({ id: '1', name: 'Test', email: 'test@test.com', plan: 'free' }, 'abc123')
    auth.clearAuth()
    expect(auth.isAuthenticated).toBe(false)
    expect(auth.user).toBeNull()
    expect(auth.token).toBeNull()
  })
})
