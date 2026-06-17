const interval = ref<ReturnType<typeof setInterval> | null>(null)

export function useDiveMode() {
  const active = useState('diveMode', () => false)
  const elapsed = useState('diveElapsed', () => 0)
  const externalCountdown = useState<number | null>('diveExternalCountdown', () => null)

  function start() {
    active.value = true
    elapsed.value = 0
    if (interval.value) clearInterval(interval.value)
    interval.value = setInterval(() => {
      elapsed.value++
    }, 1000)
  }

  function stop() {
    active.value = false
    if (interval.value) {
      clearInterval(interval.value)
      interval.value = null
    }
  }

  function setCountdown(seconds: number | null) {
    externalCountdown.value = seconds
  }

  function formatElapsed(seconds: number) {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return { active, elapsed, externalCountdown, start, stop, setCountdown, formatElapsed }
}
