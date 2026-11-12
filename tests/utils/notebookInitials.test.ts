import { describe, expect, it } from 'vitest'
import { notebookInitials } from '~/utils/notebookInitials'

describe('notebookInitials (capinha do caderno, A2)', () => {
  it('pega a 1ª letra das duas primeiras palavras relevantes', () => {
    expect(notebookInitials('TRF 4ª Região — Analista Judiciário')).toBe('TR')
    expect(notebookInitials('Inglês instrumental')).toBe('II')
    expect(notebookInitials('Direito do Trabalho')).toBe('DT')
    expect(notebookInitials('TJ-SP · Oficial de Justiça')).toBe('TO')
  })
  it('uma palavra dá as duas primeiras letras; vazio dá ""', () => {
    expect(notebookInitials('Anatomia')).toBe('AN')
    expect(notebookInitials('  ')).toBe('')
    expect(notebookInitials('2026')).toBe('')
  })
})
