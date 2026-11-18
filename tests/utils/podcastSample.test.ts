import { describe, expect, it } from 'vitest'
import { PODCAST_SAMPLE, sampleClock, sampleCountdownAt, sampleLineAt } from '~/utils/podcastSample'
import { SAMPLE, landingCountdownAt, landingLineAt } from '~/utils/landing'
import { ENTRY_SAMPLE, entryCountdownAt, sampleLineAt as entryLineAt } from '~/utils/entrada'

describe('amostra do podcast (paywall e landing)', () => {
  it('a linha falada segue o tempo do arquivo', () => {
    expect(sampleLineAt(0)).toBe(0)
    expect(sampleLineAt(9)).toBe(1)
    expect(sampleLineAt(17)).toBe(2)
    expect(sampleLineAt(20)).toBe(3)
    expect(sampleLineAt(23)).toBe(4)
    expect(sampleLineAt(27)).toBe(5)
    expect(sampleLineAt(31)).toBe(6)
    expect(sampleLineAt(44)).toBe(7)
    expect(sampleLineAt(50)).toBe(8)
  })

  it('a pausa conta 4, 3, 2, 1 nos tiques do arquivo e some fora dela', () => {
    const at = [0, 25, 26.2, 26.95, 27.95, 28.95, 29.95, 30.4, 30.6]
    const expected = [null, null, 4, 4, 3, 2, 1, 1, null]
    expect(at.map(sampleCountdownAt)).toEqual(expected)
    // The landing and the entry have their own copies of the rule (no shared chunk): same numbers
    expect(at.map(landingCountdownAt)).toEqual(expected)
    expect(at.map(entryCountdownAt)).toEqual(expected)
    expect(at.map(landingLineAt)).toEqual(at.map(sampleLineAt))
    expect(at.map(entryLineAt)).toEqual(at.map(sampleLineAt))
  })

  it('relógio em m:ss', () => {
    expect(sampleClock(0)).toBe('0:00')
    expect(sampleClock(PODCAST_SAMPLE.duration)).toBe('0:50')
    expect(sampleClock(-1)).toBe('0:00')
  })

  it('a landing toca a mesma amostra, com a forma de onda', () => {
    // A copy in utils/landing.ts (no shared chunk on the landing): both must stay equal
    const { peaks, ...rest } = SAMPLE
    expect(rest).toEqual(PODCAST_SAMPLE)
    expect(peaks).toBeDefined()
    expect(SAMPLE.peaks).toHaveLength(120)
  })

  it('a entrada do /comecar toca a mesma amostra, com as barras tiradas da forma de onda da landing', () => {
    // A copy in utils/entrada.ts too (prd-entrada-comecar RN-5); the 40 bars = the loudest of each 3 of the 120 peaks
    const { bars, ...rest } = ENTRY_SAMPLE
    expect(rest).toEqual(PODCAST_SAMPLE)
    const expected = Array.from({ length: 40 }, (_, i) => Math.max(...SAMPLE.peaks.slice(i * 3, i * 3 + 3)))
    expect(bars).toEqual(expected)
  })
})
