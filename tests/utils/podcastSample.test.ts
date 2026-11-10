import { describe, expect, it } from 'vitest'
import { PODCAST_SAMPLE, sampleClock, sampleLineAt } from '~/utils/podcastSample'
import { SAMPLE } from '~/utils/landing'

describe('amostra do podcast (paywall e landing)', () => {
  it('a linha falada segue o tempo do arquivo', () => {
    expect(sampleLineAt(0)).toBe(0)
    expect(sampleLineAt(3)).toBe(1)
    expect(sampleLineAt(8)).toBe(2)
    expect(sampleLineAt(12)).toBe(3)
    expect(sampleLineAt(19)).toBe(4)
  })

  it('relógio em m:ss', () => {
    expect(sampleClock(0)).toBe('0:00')
    expect(sampleClock(19.8)).toBe('0:19')
    expect(sampleClock(-1)).toBe('0:00')
  })

  it('a landing toca a mesma amostra, com a forma de onda', () => {
    // A copy in utils/landing.ts (no shared chunk on the landing): both must stay equal
    const { peaks, ...rest } = SAMPLE
    expect(rest).toEqual(PODCAST_SAMPLE)
    expect(peaks).toBeDefined()
    expect(SAMPLE.peaks).toHaveLength(120)
  })
})
