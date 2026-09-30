/** Study e-mail hour options (prd-retencao-lembretes RF-F01): 06h–22h, Brasília time. */
export const REMINDER_HOURS = Array.from({ length: 17 }, (_, i) => i + 6)

export const DEFAULT_REMINDER_HOUR = 19

export function formatReminderHour(hour: number): string {
  return `${hour}h`
}

export const REMINDER_HOUR_OPTIONS = REMINDER_HOURS.map(h => ({ value: String(h), label: `${String(h).padStart(2, '0')}:00` }))

/** API code for a bounced/complained address (422). */
export function isEmailSuppressedError(e: unknown): boolean {
  return (e as any)?.data?.code === 'EMAIL_SUPPRESSED'
}
