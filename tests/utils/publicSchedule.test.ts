import { beforeEach, describe, expect, it, vi } from 'vitest'
import { editalPointsByName, isEmail, loadPublicSchedule, publicScheduleInput, publicScheduleKey, savePublicSchedule, defaultPublicSchedule } from '~/utils/publicSchedule'
import type { EditalProposal } from '~/types'

const proposal: EditalProposal = {
  name: 'TJ-SP · Escrevente',
  exam_date: null,
  subjects: [
    { name: 'Língua Portuguesa', topics: [{ name: 'Crase', description: null }, { name: 'Regência', description: null }] },
    { name: 'Noções de Informática', topics: [] },
  ],
} as unknown as EditalProposal

describe('publicSchedule', () => {
  // Node 25 brings a localStorage of its own without methods: a Map stands in (as in publicEdital.test.ts)
  let store = new Map<string, string>()
  beforeEach(() => {
    store = new Map()
    vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v), removeItem: (k: string) => store.delete(k) })
  })

  it('finds the edital points by name, without accents or case', () => {
    expect(editalPointsByName([{ subject: 'LINGUA PORTUGUESA', points: 20, source: 'edital' }], 'Língua Portuguesa')).toBe(20)
    expect(editalPointsByName(null, 'Língua Portuguesa')).toBeNull()
  })

  it('keeps hours, weights and the typed date on the device; a bad value falls back to the defaults', () => {
    const state = { ...defaultPublicSchedule(), hours: [1, 3, 3, 3, 3, 3, 4], weights: { s0: 12 }, examDate: '2027-02-09' }
    savePublicSchedule('abc', state)
    expect(loadPublicSchedule('abc')).toEqual(state)
    localStorage.setItem(publicScheduleKey('bad'), '{"hours":[99],"sessionMinutes":45}')
    expect(loadPublicSchedule('bad')).toEqual(defaultPublicSchedule())
  })

  it('marked assuntos are seen; the weight is the visitor\'s, then the edital\'s', () => {
    const input = publicScheduleInput(proposal, [{ subject: 'Língua Portuguesa', points: 20, source: 'edital' }], { ...defaultPublicSchedule(), weights: { s1: 5 }, examDate: '2027-02-09' }, new Set(['0.1']), '2026-11-16')
    expect(input.progress).toEqual([{ topic_id: '0.1', pass: 1, status: 'done', done_at: null }])
    expect(input.subjects[0]).toMatchObject({ points: 20, source: 'edital' })
    expect(input.subjects[1]).toMatchObject({ points: 5, source: 'manual', topics: [] })
    expect(input.examDate).toBe('2027-02-09')
    expect(input.reviewMinutes).toBe(0)
  })

  it('checks the e-mail shape', () => {
    expect(isEmail('ana@exemplo.com')).toBe(true)
    expect(isEmail('ana@exemplo')).toBe(false)
  })
})
