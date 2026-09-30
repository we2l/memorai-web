import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useFeatureFlag } from '~/composables/useFeatureFlag'

const { handle } = vi.hoisted(() => ({
  handle: { instance: null as any, run: vi.fn((fn: (p: any) => void) => { if (handle.instance) fn(handle.instance) }) },
}))
mockNuxtImport('useNuxtApp', original => () => new Proxy(original(), {
  get: (target, key) => (key === '$posthog' ? handle : Reflect.get(target, key)),
}))

describe('useFeatureFlag', () => {
  beforeEach(() => { handle.instance = null })

  it('sem consentimento/PostHog → fallback', () => {
    expect(useFeatureFlag('reverse_trial' as never).value).toBe(false)
    expect(useFeatureFlag('reverse_trial' as never, true).value).toBe(true)
  })

  it('flag ligada no PostHog → true após onFeatureFlags', () => {
    let cb: () => void = () => {}
    handle.instance = { onFeatureFlags: (fn: () => void) => { cb = fn }, isFeatureEnabled: () => true }
    const flag = useFeatureFlag('reverse_trial' as never)
    expect(flag.value).toBe(false)
    cb()
    expect(flag.value).toBe(true)
  })
})
