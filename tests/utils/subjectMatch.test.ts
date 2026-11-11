import { describe, expect, it } from 'vitest'
import { matchSubjectByFileName } from '~/utils/subjectMatch'

const subjects = [
  { id: 'pt', name: 'Língua Portuguesa' },
  { id: 'dp', name: 'Direito Penal' },
  { id: 'dpp', name: 'Direito Processual Penal' },
  { id: 'cp', name: 'Código Penal' },
  { id: 'ti', name: 'TI' },
]

describe('matchSubjectByFileName', () => {
  it('finds the matéria in the file name, without accents or case', () => {
    expect(matchSubjectByFileName('direito_penal-aula 3.pdf', subjects)?.id).toBe('dp')
    expect(matchSubjectByFileName('Apostila LINGUA PORTUGUESA.pdf', subjects)?.id).toBe('pt')
  })

  it('prefers the longest name that matches', () => {
    expect(matchSubjectByFileName('Resumo Direito Processual Penal.pdf', subjects)?.id).toBe('dpp')
    expect(matchSubjectByFileName('Penal geral.pdf', [{ id: 'p', name: 'Penal' }, { id: 'dp', name: 'Direito Penal' }])?.id).toBe('p')
  })

  it('needs whole words and at least 4 letters', () => {
    expect(matchSubjectByFileName('Direito Penalidades.pdf', subjects)).toBeNull()
    expect(matchSubjectByFileName('aula de TI.pdf', subjects)).toBeNull()
    expect(matchSubjectByFileName('edital.pdf', subjects)).toBeNull()
  })

  it('two different matches are no match', () => {
    expect(matchSubjectByFileName('Codigo Penal e Direito Penal.pdf', subjects)).toBeNull()
  })
})
