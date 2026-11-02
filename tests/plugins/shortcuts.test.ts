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

  it('Alt+N abre o "+ Adicionar" já na nota em branco (Ctrl+N é do navegador); funciona pelo code no macOS', () => {
    const add = useAddSheet()
    add.open.value = false
    const e = press({ key: '˜', code: 'KeyN', altKey: true })
    expect(e.defaultPrevented).toBe(true)
    expect(add.open.value).toBe(true)
    expect(add.preset.value).toBe('note')
    add.open.value = false
    const ctrlN = press({ key: 'n', ctrlKey: true })
    expect(ctrlN.defaultPrevented).toBe(false)
    expect(add.open.value).toBe(false)
  })

  it('"?" abre a ajuda dos atalhos, menos na revisão (que tem o próprio "?")', () => {
    press({ key: '?' })
    expect(navigateToMock).toHaveBeenCalledWith('/ajuda?tab=atalhos')
    navigateToMock.mockReset()
    document.documentElement.dataset.chrome = 'focus'
    press({ key: '?' })
    expect(navigateToMock).not.toHaveBeenCalled()
    delete document.documentElement.dataset.chrome
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
