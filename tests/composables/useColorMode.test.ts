import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useColorMode } from '~/composables/useColorMode'

// One fake prefers-color-scheme for the whole file: init() registers its listener once per app
const media = vi.hoisted(() => ({ dark: false, listeners: [] as Array<() => void> }))

// In-memory Storage: Node 25 ships its own (inert) localStorage global, so the test owns one
function memoryStorage(): Storage {
  const m = new Map<string, string>()
  return {
    get length() { return m.size },
    key: (i: number) => [...m.keys()][i] ?? null,
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => { m.set(k, String(v)) },
    removeItem: (k: string) => { m.delete(k) },
    clear: () => m.clear(),
  }
}

function setSystem(dark: boolean) {
  media.dark = dark
  for (const l of media.listeners) l()
}

describe('useColorMode', () => {
  beforeEach(() => {
    window.matchMedia = ((query: string) => ({
      get matches() { return query.includes('dark') && media.dark },
      media: query,
      addEventListener: (_: string, l: () => void) => media.listeners.push(l),
      removeEventListener: () => {},
    })) as unknown as typeof window.matchMedia
    media.dark = false
    vi.stubGlobal('localStorage', memoryStorage())
    document.documentElement.classList.remove('dark')
    document.documentElement.style.colorScheme = ''
    clearNuxtState(['color-mode', 'color-mode-preference'])
  })

  it('sem escolha salva segue o sistema', () => {
    setSystem(true)
    const { preference, colorMode, init } = useColorMode()
    init()
    expect(preference.value).toBe('system')
    expect(colorMode.value).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.style.colorScheme).toBe('dark')
  })

  it('"Sistema" reage quando o sistema troca de tema', () => {
    const { colorMode, init } = useColorMode()
    init()
    expect(colorMode.value).toBe('light')
    setSystem(true)
    expect(colorMode.value).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    setSystem(false)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('escolha explícita grava a chave color-mode e ignora o sistema', () => {
    const { set, colorMode } = useColorMode()
    set('dark')
    expect(localStorage.getItem('color-mode')).toBe('dark')
    setSystem(false)
    expect(colorMode.value).toBe('dark')
    set('system')
    expect(localStorage.getItem('color-mode')).toBe('system')
    expect(colorMode.value).toBe('light')
  })

  it('lê a escolha salva (light | dark) e trata valor desconhecido como sistema', () => {
    localStorage.setItem('color-mode', 'light')
    setSystem(true)
    const a = useColorMode()
    a.init()
    expect(a.colorMode.value).toBe('light')

    localStorage.setItem('color-mode', 'roxo')
    a.init()
    expect(a.preference.value).toBe('system')
    expect(a.colorMode.value).toBe('dark')
  })

  it('toggle inverte o tema da tela e sai do "Sistema"', () => {
    setSystem(true)
    const { toggle, preference, colorMode, init } = useColorMode()
    init()
    toggle()
    expect(preference.value).toBe('light')
    expect(colorMode.value).toBe('light')
    toggle()
    expect(preference.value).toBe('dark')
  })
})
