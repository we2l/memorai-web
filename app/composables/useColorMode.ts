export function useColorMode() {
  const colorMode = useState<'light' | 'dark'>('color-mode', () => 'dark')

  function toggle() {
    colorMode.value = colorMode.value === 'dark' ? 'light' : 'dark'
    apply()
  }

  function set(mode: 'light' | 'dark') {
    colorMode.value = mode
    apply()
  }

  function apply() {
    if (import.meta.client) {
      document.documentElement.classList.toggle('dark', colorMode.value === 'dark')
      localStorage.setItem('color-mode', colorMode.value)
    }
  }

  function init() {
    if (import.meta.client) {
      const saved = localStorage.getItem('color-mode') as 'light' | 'dark' | null
      colorMode.value = saved ?? 'dark'
      apply()
    }
  }

  return { colorMode, toggle, set, init }
}
