import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import ReminderPreferences from '~/components/settings/ReminderPreferences.vue'

const { apiMock, track } = vi.hoisted(() => ({ apiMock: vi.fn(), track: vi.fn() }))
mockNuxtImport('useNuxtApp', original => () => new Proxy(original(), {
  get: (target, key) => (key === '$api' ? apiMock : Reflect.get(target, key)),
}))
mockNuxtImport('useAnalytics', () => () => ({ track, identify: vi.fn(), reset: vi.fn() }))

describe('ReminderPreferences — reminder_toggled (prd-retencao-lembretes F7)', () => {
  beforeEach(() => {
    apiMock.mockReset()
    track.mockClear()
  })

  it('emite após o PUT de sucesso com source settings', async () => {
    apiMock.mockResolvedValue({ data: {} })
    const w = await mountSuspended(ReminderPreferences, { props: { settings: { reminder_enabled: true, reminder_hour: 20 } as any } })
    await w.get('[data-testid="reminder-switch"]').trigger('click')
    await flushPromises()
    expect(track).toHaveBeenCalledWith('reminder_toggled', { on: false, hour: 20, source: 'settings' })
  })

  it('não emite quando o PUT falha', async () => {
    apiMock.mockRejectedValue(Object.assign(new Error('x'), { statusCode: 500 }))
    const w = await mountSuspended(ReminderPreferences, { props: { settings: { reminder_enabled: false, reminder_hour: 19 } as any } })
    await w.get('[data-testid="reminder-switch"]').trigger('click')
    await flushPromises()
    expect(track).not.toHaveBeenCalled()
  })
})
