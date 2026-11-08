import { describe, expect, it } from 'vitest'
import { answerDiff, answersMatch, normalizeAnswer } from '~/utils/answerCheck'

describe('answerCheck (prd-revisao-v5-fase-b B-D7)', () => {
  it('ignores accents, case, punctuation and spaces', () => {
    expect(normalizeAnswer('  Ação  Civil, Pública! ')).toBe('acao civil publica')
    expect(answersMatch('acao civil publica', 'Ação Civil Pública')).toBe(true)
    expect(answersMatch('Art. 5º', 'art 5º')).toBe(true)
    expect(answersMatch('to borrow', 'To borrow.')).toBe(true)
  })

  it('does not accept synonyms, plurals, typos or an empty answer', () => {
    expect(answersMatch('emprestar', 'to borrow')).toBe(false)
    expect(answersMatch('habeas datas', 'habeas data')).toBe(false)
    expect(answersMatch('mitocondira', 'mitocôndria')).toBe(false)
    expect(answersMatch('  ', '')).toBe(false)
  })

  it('shows the words missing and extra, as written in the answer', () => {
    expect(answerDiff('ação popular', 'Ação Civil Pública')).toEqual([
      { kind: 'same', text: 'Ação' },
      { kind: 'missing', text: 'Civil Pública' },
      { kind: 'extra', text: 'popular' },
    ])
    expect(answerDiff('to borrow', 'to borrow')).toEqual([{ kind: 'same', text: 'to borrow' }])
  })
})
