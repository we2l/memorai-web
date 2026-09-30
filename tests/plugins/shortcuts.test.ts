import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { handleGlobalShortcut } from '~/plugins/shortcuts.client'

const { navigateToMock } = vi.hoisted(() => ({ navigateToMock: vi.fn() }))
mockNuxtImport('navigateTo', () => navigateToMock)

function press(init: KeyboardEventInit, target: EventTarget = document.body) {
  const e = new KeyboardEvent('keydown', { ...init, bubbles: true, cancelable: true })
  Object.defineProperty(e, 'target', { value: target })
  handleGlobalShortcut(e)
  return e
}

describe('atalhos globais (plugin)', () => {
  beforeEach(() => {
    navigateToMock.mockReset()
    useCommandPaletteOpen().value = false
    useAuthStore().user = { id: 'u1', name: 'Ana', email: 'a@b.c' } as any
  })

  it('⌘K abre a paleta sem ela estar montada', () => {
    const e = press({ key: 'k', metaKey: true })
    expect(useCommandPaletteOpen().value).toBe(true)
    expect(e.defaultPrevented).toBe(true)
    press({ key: 'k', ctrlKey: true })
    expect(useCommandPaletteOpen().value).toBe(false)
  })

  it('Alt+R navega para /revisar', () => {
    press({ key: 'r', altKey: true })
    expect(navigateToMock).toHaveBeenCalledWith('/revisar')
  })

  it('não dispara em input, exceto ⌘K', () => {
    const input = document.createElement('input')
    press({ key: 'r', altKey: true }, input)
    expect(navigateToMock).not.toHaveBeenCalled()
    press({ key: 'k', metaKey: true }, input)
    expect(useCommandPaletteOpen().value).toBe(true)
  })

  it('ignora atalhos sem sessão', () => {
    useAuthStore().user = null
    press({ key: 'k', metaKey: true })
    expect(useCommandPaletteOpen().value).toBe(false)
  })
})
