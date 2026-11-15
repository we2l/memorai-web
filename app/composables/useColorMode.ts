/**
 * Tema do app: a única fonte de "claro / escuro / sistema" (prd-ds-v3-fundacao RF-1.4).
 * O script inline do <head> (THEME_SCRIPT em nuxt.config.ts) aplica o tema antes de pintar; aqui ficam
 * a preferência, a troca e o acompanhamento do sistema em tempo de execução. Os alternadores (menu
 * da conta, configurações) só chamam set/toggle.
 * localStorage['color-mode'] = light | dark | system (ausente = system); os E2E escrevem essa chave.
 */
export type ColorModePreference = 'light' | 'dark' | 'system'
export type ColorMode = 'light' | 'dark'

const STORAGE_KEY = 'color-mode'
const DARK_QUERY = '(prefers-color-scheme: dark)'
let listening = false

function readPreference(): ColorModePreference {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved === 'light' || saved === 'dark' ? saved : 'system'
  } catch {
    return 'system'
  }
}

function systemMode(): ColorMode {
  return window.matchMedia?.(DARK_QUERY).matches ? 'dark' : 'light'
}

export function useColorMode() {
  const preference = useState<ColorModePreference>('color-mode-preference', () => 'system')
  // Resolved theme; starts from what the <head> script already put on <html>
  const colorMode = useState<ColorMode>('color-mode', () =>
    import.meta.client && document.documentElement.classList.contains('dark') ? 'dark' : 'light')

  function apply() {
    if (!import.meta.client) return
    const mode = preference.value === 'system' ? systemMode() : preference.value
    colorMode.value = mode
    const root = document.documentElement
    root.classList.toggle('dark', mode === 'dark')
    root.style.colorScheme = mode
    // Browser bar follows the app theme, not only the OS: the color of the top bars of the theme just applied
    // (--surface-raised, white in A2, ADR-037), the same the <head> script and the manifest use (nuxt.config.ts
    // THEME_COLOR); before 15/11/2026 this wrote the tinted page color and the bar changed color after the boot
    const bars = getComputedStyle(root).getPropertyValue('--surface-raised').trim()
    if (!bars) return
    for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
      meta.setAttribute('content', bars)
      meta.removeAttribute('media')
    }
  }

  function set(mode: ColorModePreference) {
    preference.value = mode
    try {
      localStorage.setItem(STORAGE_KEY, mode)
    } catch {
      // intencional: modo privado / storage bloqueado; a escolha vale só para esta página
    }
    apply()
  }

  /** Flips the theme on screen (an explicit choice: leaves "system"). */
  function toggle() {
    set(colorMode.value === 'dark' ? 'light' : 'dark')
  }

  function init() {
    if (!import.meta.client) return
    preference.value = readPreference()
    apply()
    if (listening) return
    listening = true
    window.matchMedia?.(DARK_QUERY).addEventListener?.('change', () => {
      if (preference.value === 'system') apply()
    })
  }

  return { preference, colorMode, set, toggle, init }
}
