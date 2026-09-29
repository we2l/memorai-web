import { describe, expect, it } from 'vitest'
import { formatTime } from '~/utils/format'

describe('formatTime', () => {
  it.each([
    [0, '0:00'],
    [59, '0:59'],
    [60, '1:00'],
    [61.9, '1:01'],
    [3600, '60:00'],
  ])('%s s → %s', (seconds, expected) => {
    expect(formatTime(seconds)).toBe(expected)
  })
})
