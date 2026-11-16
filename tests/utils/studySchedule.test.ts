import { describe, expect, it } from 'vitest'
import {
  addDays,
  buildStudySchedule,
  draftOf,
  editalPointsOf,
  FINAL_DAYS,
  inputWithDraft,
  reviewMinutesOf,
  scheduleInputFromResource,
  todaySessions,
  weekdayOf,
  type ScheduleSubjectInput,
  type StudyScheduleInput,
  type StudyScheduleResource,
} from '~/utils/studySchedule'

// 2026-11-16 is a Monday
const TODAY = '2026-11-16'

function subject(id: string, n: number, extra: Partial<ScheduleSubjectInput> = {}): ScheduleSubjectInput {
  return { id, name: id.toUpperCase(), topics: Array.from({ length: n }, (_, i) => ({ id: `${id}${i + 1}`, name: `${id} ${i + 1}` })), ...extra }
}

function input(extra: Partial<StudyScheduleInput> = {}): StudyScheduleInput {
  return {
    subjects: [subject('lp', 6), subject('da', 4), subject('rl', 3)],
    hoursByWeekday: [0, 2, 2, 2, 2, 2, 3],
    sessionMinutes: 60,
    examDate: addDays(TODAY, 120),
    today: TODAY,
    reviewMinutes: 15,
    ...extra,
  }
}

describe('reviewMinutesOf', () => {
  it('is batches × size × 15 s', () => {
    expect(reviewMinutesOf({ daily_goal_batches: 3, review_batch_size: 20 })).toBe(15)
    expect(reviewMinutesOf(null)).toBe(0)
  })
})

describe('buildStudySchedule', () => {
  it('without an exam date is only the queue: round 1 in edital order per matéria, then round 2', () => {
    const s = buildStudySchedule(input({ examDate: null }))
    expect(s.days).toEqual([])
    expect(s.summary.calendar).toBe(false)
    expect(s.overflow).toBeNull()
    expect(s.sessions.every(x => x.date === null)).toBe(true)
    expect(s.sessions).toHaveLength(13 * 2)
    const firstRound = s.sessions.filter(x => x.pass === 1)
    expect(s.sessions.slice(0, 13).every(x => x.pass === 1)).toBe(true)
    expect(firstRound.filter(x => x.subjectId === 'lp').map(x => x.topicId)).toEqual(['lp1', 'lp2', 'lp3', 'lp4', 'lp5', 'lp6'])
    // Never the same matéria twice in a row while there is another
    for (let i = 1; i < 8; i++) expect(s.sessions[i]!.subjectId).not.toBe(s.sessions[i - 1]!.subjectId)
    expect(todaySessions(s, TODAY)).toHaveLength(1)
  })

  it('keeps the final stretch free and starts the calendar today', () => {
    const s = buildStudySchedule(input())
    expect(s.days[0]!.date).toBe(TODAY)
    expect(s.days).toHaveLength(120)
    const final = s.days.slice(-FINAL_DAYS)
    expect(final.every(d => d.phase === 'final' && d.sessions.length === 0)).toBe(true)
    expect(s.summary.finalStart).toBe(addDays(TODAY, 120 - FINAL_DAYS))
    expect(s.days.filter(d => weekdayOf(d.date) === 0).every(d => d.sessions.length === 0)).toBe(true)
  })

  it('never goes above the declared hours and keeps the slack on average', () => {
    const s = buildStudySchedule(input({ subjects: [subject('a', 200), subject('b', 200)] }))
    const study = s.days.filter(d => d.phase === 'study')
    for (const d of study) expect(d.minutes).toBeLessThanOrEqual([0, 2, 2, 2, 2, 2, 3][d.weekday]! * 60)
    const declared = study.reduce((n, d) => n + Math.max(0, [0, 2, 2, 2, 2, 2, 3][d.weekday]! * 60 - 15), 0)
    const used = study.reduce((n, d) => n + d.minutes, 0)
    expect(used / declared).toBeGreaterThan(0.75)
    expect(used / declared).toBeLessThanOrEqual(0.86)
  })

  it('puts at most 2 matérias a day, 3 when the day has 3 or more sessions', () => {
    const subjects = Array.from({ length: 8 }, (_, i) => subject(`m${i}`, 20))
    const s = buildStudySchedule(input({ subjects, hoursByWeekday: [0, 2, 2, 2, 2, 2, 6] }))
    for (const d of s.days) {
      const distinct = new Set(d.sessions.map(x => x.subjectId)).size
      expect(distinct).toBeLessThanOrEqual(d.sessions.length >= 3 ? 3 : 2)
    }
    expect(s.days.some(d => new Set(d.sessions.map(x => x.subjectId)).size === 3)).toBe(true)
  })

  it('gives the heavier matéria more sessions (points × level) and by size without points', () => {
    const weighted = buildStudySchedule(input({
      subjects: [subject('lp', 4, { points: 30, source: 'edital' }), subject('rl', 4, { points: 10, source: 'edital' })],
      examDate: addDays(TODAY, 30),
    }))
    const lp = weighted.bySubject.find(x => x.id === 'lp')!
    const rl = weighted.bySubject.find(x => x.id === 'rl')!
    expect(lp.source).toBe('edital')
    expect(lp.plannedMinutes).toBeGreaterThan(rl.plannedMinutes)

    // Null weight: the number of assuntos
    const bySize = buildStudySchedule(input({ subjects: [subject('big', 10, { points: null }), subject('small', 2)] }))
    expect(bySize.bySubject[0]!.source).toBe('size')
    expect(bySize.bySubject[0]!.weight).toBe(10)
    expect(bySize.bySubject[1]!.weight).toBe(2)

    const beginner = buildStudySchedule(input({ subjects: [subject('a', 4, { level: 'beginner' }), subject('b', 4, { level: 'mastered' })] }))
    expect(beginner.bySubject[0]!.weight).toBeCloseTo(5.2)
    expect(beginner.bySubject[1]!.weight).toBeCloseTo(2.4)
  })

  it('without assuntos the matéria itself is one unit', () => {
    const s = buildStudySchedule(input({ subjects: [{ id: 'info', name: 'Informática', topics: [] }, subject('lp', 2)], examDate: null }))
    const info = s.sessions.filter(x => x.subjectId === 'info')
    expect(info).toHaveLength(2)
    expect(info[0]!.topicId).toBe('info')
    expect(info[0]!.unit).toBe(true)
  })

  it('says when the plan does not fit: the missing hours and when the first contact would end', () => {
    const s = buildStudySchedule(input({ subjects: [subject('a', 80), subject('b', 80)], examDate: addDays(TODAY, 37) }))
    expect(s.overflow?.kind).toBe('late')
    expect(s.overflow!.missingSessions).toBeGreaterThan(0)
    expect(s.overflow!.missingHours).toBeGreaterThan(0)
    expect(s.overflow!.lateDays).toBeGreaterThan(0)
    expect(s.overflow!.firstContactEnd! > s.summary.lastStudyDay!).toBe(true)
    // The late sessions are in the queue, off the calendar
    expect(s.sessions.some(x => x.late && x.date === null)).toBe(true)
  })

  it('flags a tight plan when round 1 takes more than its share but still fits', () => {
    const s = buildStudySchedule(input({ subjects: [subject('a', 30), subject('b', 30)], examDate: addDays(TODAY, 60) }))
    expect(s.overflow?.kind).toBe('tight')
    expect(s.overflow!.lateDays).toBe(0)
  })

  it('a plan with room has no overflow and ends the first contact before the final stretch', () => {
    const s = buildStudySchedule(input())
    expect(s.overflow).toBeNull()
    expect(s.summary.firstContactEnd! <= s.summary.lastStudyDay!).toBe(true)
    expect(s.sessions.some(x => x.pass === 2)).toBe(true)
  })

  it('done sessions leave the queue; a late plan keeps the not-done ones on top and restarts today', () => {
    const base = input({ createdAt: addDays(TODAY, -14), progress: [{ topic_id: 'lp1', pass: 1, status: 'done', done_at: `${addDays(TODAY, -10)}T20:00:00-03:00` }] })
    const s = buildStudySchedule(base)
    expect(s.sessions.some(x => x.topicId === 'lp1' && x.pass === 1)).toBe(false)
    expect(s.bySubject.find(x => x.id === 'lp')!.seen).toBe(1)
    expect(s.summary.seenPct).toBe(Math.round(100 / 13))
    // Nothing else was done in two weeks: the plan is behind, and today starts with the next of the queue
    expect(s.summary.behind).toBeGreaterThan(5)
    expect(s.days[0]!.sessions[0]!.pass).toBe(1)
    expect(s.days[0]!.date).toBe(TODAY)
    expect(s.sessions.filter(x => x.subjectId === 'lp' && x.pass === 1)[0]!.topicId).toBe('lp2')
    expect(s.done).toHaveLength(1)
  })

  it('what was done today takes today\'s time', () => {
    const s = buildStudySchedule(input({ hoursByWeekday: [0, 3, 3, 3, 3, 3, 3], progress: [{ topic_id: 'lp1', pass: 1, status: 'done', done_at: `${TODAY}T22:30:00Z` }] }))
    const without = buildStudySchedule(input({ hoursByWeekday: [0, 3, 3, 3, 3, 3, 3] }))
    expect(s.summary.doneToday).toBe(1)
    expect(s.days[0]!.sessions.length).toBe(without.days[0]!.sessions.length - 1)
  })

  it('skipped sessions go to the end of their round, in the order of done_at', () => {
    const s = buildStudySchedule(input({
      examDate: null,
      progress: [
        { topic_id: 'lp1', pass: 1, status: 'skipped', done_at: '2026-11-15T10:00:00-03:00' },
        { topic_id: 'da1', pass: 1, status: 'skipped', done_at: '2026-11-14T10:00:00-03:00' },
      ],
    }))
    const round1 = s.sessions.filter(x => x.pass === 1)
    expect(round1.slice(-2).map(x => x.topicId)).toEqual(['da1', 'lp1'])
    expect(round1.at(-1)!.skipped).toBe(true)
  })

  it('round 2 goes by the weakest assunto first', () => {
    const lp = subject('lp', 3)
    lp.topics[0]!.accuracy = 80
    lp.topics[1]!.accuracy = 40
    lp.topics[2]!.reviewed = 0
    lp.topics[0]!.reviewed = 50
    lp.topics[1]!.reviewed = 50
    const s = buildStudySchedule(input({ subjects: [lp], examDate: null }))
    expect(s.sessions.filter(x => x.pass === 2).map(x => x.topicId)).toEqual(['lp2', 'lp3', 'lp1'])
  })

  it('start times give the hour of each session', () => {
    const s = buildStudySchedule(input({ startTimes: [null, '19:00', '19:00', '19:00', '19:00', '19:00', '09:00'] }))
    const day = s.days.find(d => d.sessions.length === 2)!
    expect(day.sessions.map(x => x.start)).toEqual(['19:00', '20:00'])
  })

  it('is deterministic', () => {
    expect(buildStudySchedule(input())).toEqual(buildStudySchedule(input()))
  })

  it('with no hours at all nothing is placed and the first contact never ends', () => {
    const s = buildStudySchedule(input({ hoursByWeekday: [0, 0, 0, 0, 0, 0, 0] }))
    expect(s.summary.sessions).toBe(0)
    expect(s.overflow?.kind).toBe('late')
    expect(s.overflow!.firstContactEnd).toBeNull()
  })

  it('handles 391 assuntos in under 100 ms', () => {
    const subjects = Array.from({ length: 17 }, (_, i) => subject(`s${i}`, 23, { points: 5 + i }))
    const t0 = performance.now()
    const s = buildStudySchedule(input({ subjects, examDate: addDays(TODAY, 365), hoursByWeekday: [4, 4, 4, 4, 4, 4, 6] }))
    const ms = performance.now() - t0
    expect(s.summary.topics).toBe(391)
    expect(ms).toBeLessThan(100)
  })
})

describe('scheduleInputFromResource', () => {
  it('maps the API resource, with the defaults before the first save', () => {
    const res: StudyScheduleResource = {
      configured: false,
      topic: { id: 'root', name: 'TJ-SP' },
      hours_by_weekday: null,
      start_times: null,
      session_minutes: null,
      levels: { lp: 'beginner' },
      weights: { lp: { points: 20, source: 'edital' } },
      exam: { id: 'e', title: 'Prova', date: '2027-02-09' },
      subjects: [{ id: 'lp', name: 'LP', topics: [{ id: 't', name: 'Crase', cards: 3, reviewed: 1, accuracy: null }] }],
      progress: [],
      review: { daily_goal_batches: 3, review_batch_size: 20 },
      created_at: null,
      updated_at: null,
    }
    const i = scheduleInputFromResource(res, TODAY)
    expect(i.hoursByWeekday).toEqual([0, 2, 2, 2, 2, 2, 3])
    expect(i.sessionMinutes).toBe(60)
    expect(i.reviewMinutes).toBe(15)
    expect(i.subjects[0]).toMatchObject({ points: 20, source: 'edital', level: 'beginner' })
    expect(i.examDate).toBe('2027-02-09')
  })

  it('keeps the edital points beside a manual weight (edital_points of the matéria)', () => {
    const res: StudyScheduleResource = {
      configured: true,
      topic: { id: 'root', name: 'TJ-SP' },
      hours_by_weekday: [0, 2, 2, 2, 2, 2, 3],
      start_times: null,
      session_minutes: 60,
      levels: {},
      weights: { lp: { points: 30, source: 'manual' } },
      exam: null,
      subjects: [
        { id: 'lp', name: 'LP', edital_points: 20, topics: [{ id: 't', name: 'Crase', cards: 0, reviewed: 0, accuracy: null }] },
        { id: 'dp', name: 'DP', edital_points: null, topics: [] },
      ],
      progress: [],
      review: null,
      created_at: null,
      updated_at: null,
    }
    expect(editalPointsOf(res, 'lp')).toBe(20)
    expect(editalPointsOf(res, 'dp')).toBeNull()
    const summary = buildStudySchedule(scheduleInputFromResource(res, TODAY)).bySubject
    expect(summary[0]).toMatchObject({ points: 30, source: 'manual', editalPoints: 20 })
    // Clearing the manual weight in the sheet brings the edital's points back, not the size
    const draft = draftOf(res)
    delete draft.weights.lp
    expect(inputWithDraft(res, draft, TODAY).subjects[0]).toMatchObject({ points: 20, source: 'edital' })
  })
})
