/** Duration as m:ss (e.g. 0:05, 12:30, 60:00). Fractions of a second are dropped. */
export function formatTime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds || 0))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
