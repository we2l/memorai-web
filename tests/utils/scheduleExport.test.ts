import { describe, expect, it } from 'vitest'
import { buildScheduleCsv, buildScheduleIcs, ICS_MAX_EVENTS, icsEscape, icsFold, scheduleFileName } from '~/utils/scheduleExport'
import { addDays, buildStudySchedule, type StudySession } from '~/utils/studySchedule'

const TODAY = '2026-11-16'

function schedule(startTimes: (string | null)[] | null = null) {
  return buildStudySchedule({
    subjects: [
      { id: 'lp', name: 'Língua Portuguesa', topics: [{ id: 'crase', name: 'Crase; regência, e vírgula' }, { id: 'reg', name: '=SOMA(A1)' }] },
      { id: 'da', name: 'Direito Administrativo', topics: Array.from({ length: 200 }, (_, i) => ({ id: `da${i}`, name: `Atos ${i}` })) },
    ],
    hoursByWeekday: [0, 2, 2, 2, 2, 2, 3],
    startTimes,
    sessionMinutes: 60,
    examDate: addDays(TODAY, 200),
    today: TODAY,
    reviewMinutes: 15,
    progress: [{ topic_id: 'reg', pass: 1, status: 'done', done_at: '2026-11-10T20:00:00-03:00' }],
  })
}

const unfold = (ics: string) => ics.replace(/\r\n /g, '')

describe('icsEscape and icsFold', () => {
  it('escapes the TEXT characters of RFC 5545', () => {
    expect(icsEscape('a;b,c\\d\ne')).toBe('a\\;b\\,c\\\\d\\ne')
  })

  it('folds at 75 octets without splitting an accented letter', () => {
    const line = `SUMMARY:${'ção'.repeat(40)}`
    const folded = icsFold(line)
    const enc = new TextEncoder()
    for (const part of folded.split('\r\n')) expect(enc.encode(part).length).toBeLessThanOrEqual(75)
    expect(folded.replace(/\r\n /g, '')).toBe(line)
    expect(icsFold('SHORT:x')).toBe('SHORT:x')
  })
})

describe('buildScheduleIcs', () => {
  it('has one VEVENT per session, all-day without a start time, at most 120', () => {
    const s = schedule()
    const ics = buildScheduleIcs(s.sessions, { name: 'TJ-SP', now: new Date('2026-11-16T12:00:00Z') })
    const events = ics.match(/BEGIN:VEVENT/g) ?? []
    expect(events.length).toBe(ICS_MAX_EVENTS)
    expect(ics).toContain(`DTSTART;VALUE=DATE:${TODAY.replace(/-/g, '')}`)
    expect(ics).toContain('DTSTAMP:20261116T120000Z')
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true)
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
    expect(unfold(ics)).toContain('SUMMARY:Língua Portuguesa · Crase\\; regência\\, e vírgula')
  })

  it('uses the start time and the length of the session (São Paulo, in UTC)', () => {
    const s = schedule([null, '19:00', '19:00', '19:00', '19:00', '19:00', '09:00'])
    const ics = buildScheduleIcs(s.sessions, { name: 'TJ-SP', now: new Date('2026-11-16T12:00:00Z') })
    expect(ics).toContain('DTSTART:20261116T220000Z')
    expect(ics).toContain('DTEND:20261116T230000Z')
  })

  it('leaves out what has no date', () => {
    const queue: StudySession[] = [{ id: 'x:1:1', subjectId: 'a', subjectName: 'A', topicId: 'x', topicName: 'X', unit: false, pass: 1, part: 1, parts: 1, minutes: 60, skipped: false, date: null, start: null, late: false }]
    expect(buildScheduleIcs(queue, { name: 'A', now: new Date() })).not.toContain('BEGIN:VEVENT')
  })
})

describe('buildScheduleCsv', () => {
  it('has the BOM, the header with ";" and guards formulas; done rows say sim', () => {
    const csv = buildScheduleCsv(schedule(), 60)
    expect(csv.charCodeAt(0)).toBe(0xFEFF)
    const lines = csv.slice(1).split('\r\n')
    expect(lines[0]).toBe('Data;Dia;Início;Matéria;Assunto;Minutos;Rodada;Feito')
    expect(lines[1]).toBe(`10/11/2026;ter;;Língua Portuguesa;'=SOMA(A1);60;1;sim`)
    expect(lines[2]).toMatch(/^16\/11\/2026;seg;;/)
    expect(csv).toContain('"Crase; regência, e vírgula"')
  })

  it('names the file by the caderno', () => {
    expect(scheduleFileName('TJ-SP · Escrevente', 'csv')).toBe('cronograma-tj-sp-escrevente.csv')
    expect(scheduleFileName(null, 'ics')).toBe('cronograma.ics')
  })
})
