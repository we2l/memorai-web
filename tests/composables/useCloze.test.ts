import { describe, it, expect } from 'vitest'
import { useCloze } from '~/composables/useCloze'

describe('useCloze', () => {
  const { renderQuestion, renderAnswer } = useCloze()

  describe('renderQuestion', () => {
    it('replaces cloze with blank', () => {
      const result = renderQuestion('{{c1::Anatomy}} is the study of structures', 1)
      expect(result).toContain('class="cloze-blank"')
      expect(result).toContain('...')
      expect(result).not.toContain('Anatomy')
    })

    it('shows hint when provided', () => {
      const result = renderQuestion('Your {{c1::integumentary system::... system}} is your body', 1)
      expect(result).toContain('... system')
    })

    it('only hides target cloze index', () => {
      const result = renderQuestion('{{c1::Anatomy}} studies {{c2::structures}}', 1)
      expect(result).toContain('cloze-blank')
      expect(result).toContain('structures') // c2 shown as text
    })

    it('hides all clozes of same index', () => {
      const result = renderQuestion('{{c1::A}} and {{c1::B}} are related', 1)
      expect(result).not.toContain('>A<')
      expect(result).not.toContain('>B<')
    })

    it('handles HTML inside cloze', () => {
      const result = renderQuestion('{{c1::<b>Anatomy</b>::what}} is important', 1)
      expect(result).toContain('cloze-blank')
      expect(result).toContain('what')
    })

    it('handles empty cloze', () => {
      const result = renderQuestion('Text {{c5::}} more text', 5)
      expect(result).toContain('cloze-blank')
    })
  })

  describe('renderAnswer', () => {
    it('shows answer with highlight', () => {
      const result = renderAnswer('{{c1::Anatomy}} is the study', 1)
      expect(result).toContain('cloze-answer')
      expect(result).toContain('Anatomy')
    })

    it('only highlights target cloze index', () => {
      const result = renderAnswer('{{c1::Anatomy}} studies {{c2::structures}}', 1)
      expect(result).toContain('cloze-answer')
      expect(result).toContain('Anatomy')
      expect(result).not.toContain('<strong class="cloze-answer">structures</strong>')
    })

    it('handles HTML inside cloze', () => {
      const result = renderAnswer('{{c1::<b>Anatomy</b>}} is important', 1)
      expect(result).toContain('cloze-answer')
      expect(result).toContain('<b>Anatomy</b>')
    })
  })

  describe('wrapper patterns', () => {
    it('strips [[r::...]] wrappers', () => {
      const result = renderQuestion('[[r::{{c1::Gross anatomy}} is visible]]', 1)
      expect(result).toContain('cloze-blank')
      expect(result).not.toContain('[[r')
      expect(result).toContain('is visible')
    })
  })
})
