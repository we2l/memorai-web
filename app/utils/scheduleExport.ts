// Downloads of the cronograma (prd-cronograma RF-W2): .ics (one VEVENT per session, a snapshot of the plan, RFC 5545
// escape and fold like the exam's .ics of BUG-05) and CSV (the edital's cell(): BOM, ";" and formula guard). Built in
// the browser; nothing goes to the server.
import { CSV_BOM, csvCell } from '~/utils/editalCsv'
import { addDays, sessionTopicLabel, weekdayShort, type ScheduleDone, type StudySchedule, type StudySession } from '~/utils/studySchedule'

/** About 8 weeks of sessions: the file is a snapshot, downloaded again after replanning */
export const ICS_MAX_EVENTS = 120
/** São Paulo has had no daylight saving time since 2019: a fixed offset turns the local hour into UTC */
const SP_OFFSET_HOURS = 3

/** TEXT value of RFC 5545 §3.3.11: backslash, semicolon, comma and line breaks escaped */
export function icsEscape(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r\n?|\n/g, '\\n')
}

/** Lines of at most 75 octets (UTF-8), continued with CRLF + one space (RFC 5545 §3.1); never splits a character */
export function icsFold(line: string): string {
  const enc = new TextEncoder()
  if (enc.encode(line).length <= 75) return line
  const parts: string[] = []
  let current = ''
  let size = 0
  for (const ch of line) {
    const n = enc.encode(ch).length
    const limit = parts.length ? 74 : 75
    if (size + n > limit) {
      parts.push(current)
      current = ''
      size = 0
    }
    current += ch
    size += n
  }
  parts.push(current)
  return parts.join('\r\n ')
}

const compactDate = (iso: string) => iso.slice(0, 10).replace(/-/g, '')

function utcStamp(date: string, hhmm: string, plusMinutes = 0): string {
  const [h, m] = hhmm.split(':').map(Number)
  const t = Date.parse(`${date}T00:00:00Z`) + ((h! + SP_OFFSET_HOURS) * 60 + m! + plusMinutes) * 60_000
  return new Date(t).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

export interface IcsOptions {
  /** Name of the calendar (the caderno or the edital) */
  name: string
  /** DTSTAMP */
  now: Date
  /** Link in the description of each event */
  url?: string
}

export function buildScheduleIcs(sessions: readonly StudySession[], opts: IcsOptions): string {
  const stamp = opts.now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Baigi//Cronograma//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${icsEscape(`Cronograma · ${opts.name}`)}`,
  ]
  for (const s of sessions.filter(x => x.date && !x.late).slice(0, ICS_MAX_EVENTS)) {
    const date = s.date!
    lines.push('BEGIN:VEVENT', `UID:${s.id.replace(/[^A-Za-z0-9:-]/g, '')}-${compactDate(date)}@baigi.com.br`, `DTSTAMP:${stamp}`)
    if (s.start) lines.push(`DTSTART:${utcStamp(date, s.start)}`, `DTEND:${utcStamp(date, s.start, s.minutes)}`)
    else lines.push(`DTSTART;VALUE=DATE:${compactDate(date)}`, `DTEND;VALUE=DATE:${compactDate(addDays(date, 1))}`)
    const what = s.unit ? s.subjectName : `${s.subjectName} · ${sessionTopicLabel(s)}`
    const detail = [`${s.pass === 1 ? 'Primeiro contato' : 'Reforço'} · ${s.minutes} min`, opts.url].filter(Boolean).join('\n')
    lines.push(`SUMMARY:${icsEscape(what)}`, `DESCRIPTION:${icsEscape(detail)}`, 'TRANSP:OPAQUE', 'END:VEVENT')
  }
  lines.push('END:VCALENDAR')
  return `${lines.map(icsFold).join('\r\n')}\r\n`
}

const CSV_HEADER = ['Data', 'Dia', 'Início', 'Matéria', 'Assunto', 'Minutos', 'Rodada', 'Feito']

const brDate = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

/** What is done (by its day) and then the plan, day by day; without a calendar the queue without dates */
export function buildScheduleCsv(schedule: StudySchedule, sessionMinutes: number): string {
  const rows = [CSV_HEADER.map(csvCell).join(';')]
  const doneRow = (d: ScheduleDone) => {
    const date = d.doneAt?.slice(0, 10) ?? ''
    return [date ? brDate(date) : '', date ? weekdayShort(date) : '', '', d.subjectName, d.topicName, String(sessionMinutes), String(d.pass), 'sim']
  }
  for (const d of schedule.done) rows.push(doneRow(d).map(csvCell).join(';'))
  for (const s of schedule.sessions.filter(x => !x.late)) {
    const row = [
      s.date ? brDate(s.date) : '',
      s.date ? weekdayShort(s.date) : '',
      s.start ?? '',
      s.subjectName,
      sessionTopicLabel(s),
      String(s.minutes),
      String(s.pass),
      'não',
    ]
    rows.push(row.map(csvCell).join(';'))
  }
  return `${CSV_BOM}${rows.join('\r\n')}\r\n`
}

/** cronograma-tj-sp-escrevente.csv */
export function scheduleFileName(name: string | null | undefined, ext: 'csv' | 'ics'): string {
  const slug = (name ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60).replace(/-+$/, '')
  return `cronograma${slug ? `-${slug}` : ''}.${ext}`
}

export function downloadText(content: string, type: string, fileName: string): void {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function downloadScheduleCsv(schedule: StudySchedule, sessionMinutes: number, name: string): void {
  downloadText(buildScheduleCsv(schedule, sessionMinutes), 'text/csv;charset=utf-8', scheduleFileName(name, 'csv'))
}

export function downloadScheduleIcs(schedule: StudySchedule, opts: IcsOptions): void {
  downloadText(buildScheduleIcs(schedule.sessions, opts), 'text/calendar;charset=utf-8', scheduleFileName(opts.name, 'ics'))
}
