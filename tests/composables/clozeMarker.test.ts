import { describe, it, expect } from 'vitest'
import { markToCloze, clozeToMark, getNextClozeIndex } from '~/extensions/cloze-marker'

describe('cloze-marker helpers', () => {
  describe('clozeToMark', () => {
    it('converts cloze syntax to mark HTML', () => {
      const result = clozeToMark('{{c1::Brasília}} é a capital')
      expect(result).toContain('data-cloze-index="1"')
      expect(result).toContain('class="cloze-chip"')
      expect(result).toContain('Brasília')
    })

    it('converts multiple clozes', () => {
      const result = clozeToMark('{{c1::A}} e {{c2::B}}')
      expect(result).toContain('data-cloze-index="1"')
      expect(result).toContain('data-cloze-index="2"')
    })

    it('handles hint', () => {
      const result = clozeToMark('{{c1::Brasília::capital do...}}')
      expect(result).toContain('data-cloze-hint="capital do..."')
    })

    it('returns text unchanged when no cloze', () => {
      expect(clozeToMark('texto normal')).toBe('texto normal')
    })
  })

  describe('markToCloze', () => {
    it('converts mark HTML back to cloze syntax', () => {
      const html = '<span class="cloze-chip" data-cloze-index="1">Brasília</span> é a capital'
      const result = markToCloze(html)
      expect(result).toBe('{{c1::Brasília}} é a capital')
    })

    it('converts with hint', () => {
      const html = '<span class="cloze-chip" data-cloze-index="1" data-cloze-hint="dica">Brasília</span>'
      const result = markToCloze(html)
      expect(result).toBe('{{c1::Brasília::dica}}')
    })

    it('handles multiple marks', () => {
      const html = '<span class="cloze-chip" data-cloze-index="1">A</span> e <span class="cloze-chip" data-cloze-index="2">B</span>'
      const result = markToCloze(html)
      expect(result).toContain('{{c1::A}}')
      expect(result).toContain('{{c2::B}}')
    })
  })

  describe('getNextClozeIndex', () => {
    it('returns 1 for empty content', () => {
      expect(getNextClozeIndex('')).toBe(1)
    })

    it('returns next index after existing', () => {
      const html = '<span data-cloze-index="2">B</span>'
      expect(getNextClozeIndex(html)).toBe(3)
    })

    it('returns max + 1 with multiple indices', () => {
      const html = '<span data-cloze-index="1">A</span><span data-cloze-index="3">C</span>'
      expect(getNextClozeIndex(html)).toBe(4)
    })
  })
})
