import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { EditalProposal } from '~/types'
import {
  alternativePages, checkedKey, claimCheckEvent, countsLine, daysToExam, examLine, failedReading, loadChecked, pctBucket, saveChecked,
  studiedCount, subjectStudied, submitFailure, topicKey, topicsTotal,
} from '~/utils/publicEdital'

const PROPOSAL: EditalProposal = {
  name: 'PM-PE 2026 · Soldado',
  exam_date: '2027-02-21',
  subjects: [
    { name: 'Português', topics: [{ name: 'Interpretação', description: null }, { name: 'Crase', description: 'Crase' }] },
    { name: 'Direito Penal', topics: [{ name: 'Crimes', description: null }] },
  ],
}

const httpError = (status: number, data: object = {}) => Object.assign(new Error('x'), { status, data })

describe('publicEdital: estudados', () => {
  it('conta só o que ainda existe na proposta, no total e por matéria', () => {
    const checked = new Set([topicKey(0, 1), topicKey(1, 0), '9.9', 'lixo'])
    expect(topicsTotal(PROPOSAL)).toBe(3)
    expect(studiedCount(PROPOSAL, checked)).toBe(2)
    expect(subjectStudied(PROPOSAL.subjects[0]!, 0, checked)).toBe(1)
    expect(subjectStudied(PROPOSAL.subjects[1]!, 1, checked)).toBe(1)
    expect(studiedCount(PROPOSAL, new Set())).toBe(0)
  })

  it('faixa do analytics, nunca o número exato', () => {
    expect([pctBucket(0, 10), pctBucket(1, 10), pctBucket(3, 10), pctBucket(5, 10), pctBucket(9, 10), pctBucket(10, 10), pctBucket(0, 0)])
      .toEqual(['0', '1-25', '26-50', '26-50', '76-99', '100', '0'])
  })

  it('o evento de marcar sai uma vez por sessão', () => {
    expect(claimCheckEvent()).toBe(true)
    expect(claimCheckEvent()).toBe(false)
  })
})

describe('publicEdital: estado salvo no aparelho', () => {
  // Node 25 brings a localStorage of its own without methods: a Map stands in (as in guestProgress.test.ts)
  let store = new Map<string, string>()
  const stub = () => ({ getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v), removeItem: (k: string) => store.delete(k) })
  beforeEach(() => {
    store = new Map()
    vi.stubGlobal('localStorage', stub())
  })

  it('grava e lê por edital (baigi-edital-{id})', () => {
    saveChecked('A1', new Set(['0.0', '1.0']))
    expect(JSON.parse(localStorage.getItem(checkedKey('A1'))!)).toEqual(['0.0', '1.0'])
    expect([...loadChecked('A1')]).toEqual(['0.0', '1.0'])
    expect(loadChecked('B2').size).toBe(0)
  })

  it('tudo desmarcado apaga a chave; valor ilegível abre vazio', () => {
    saveChecked('A1', new Set(['0.0']))
    saveChecked('A1', new Set())
    expect(localStorage.getItem(checkedKey('A1'))).toBeNull()
    localStorage.setItem(checkedKey('A1'), '{nao é json')
    expect(loadChecked('A1').size).toBe(0)
    localStorage.setItem(checkedKey('A1'), '{"a":1}')
    expect(loadChecked('A1').size).toBe(0)
  })

  it('sem localStorage não quebra', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('bloqueado') }, setItem: () => { throw new Error('bloqueado') }, removeItem: () => { throw new Error('bloqueado') } })
    expect(loadChecked('A1').size).toBe(0)
    expect(() => saveChecked('A1', new Set(['0.0']))).not.toThrow()
  })
})

describe('publicEdital: dias até a prova pelo dia de São Paulo', () => {
  it('conta pelo dia de SP, não pelo UTC', () => {
    // 22/02 01:30 UTC ainda é 21/02 22:30 em SP: a prova de 21/02 é hoje
    expect(daysToExam('2027-02-21', new Date('2027-02-22T01:30:00Z'))).toBe(0)
    expect(daysToExam('2027-02-21', new Date('2027-02-11T12:00:00Z'))).toBe(10)
    expect(daysToExam('2027-02-21', new Date('2027-02-22T12:00:00Z'))).toBe(-1)
    expect(daysToExam(null)).toBeNull()
    expect(daysToExam('21/02/2027')).toBeNull()
  })

  it('a linha do cabeçalho só existe com data', () => {
    const now = new Date('2026-11-13T15:00:00Z')
    expect(examLine('2027-02-21', now)).toBe('Prova em 21/02/2027 · faltam 100 dias')
    expect(examLine('2026-11-14', now)).toBe('Prova em 14/11/2026 · falta 1 dia')
    expect(examLine('2026-11-13', now)).toBe('Prova em 13/11/2026 · é hoje')
    expect(examLine('2026-11-01', now)).toBe('Prova em 01/11/2026 · já passou')
    expect(examLine(null, now)).toBeNull()
  })
})

describe('publicEdital: mensagens', () => {
  it('os códigos do failed dizem o próximo passo', () => {
    expect(failedReading({ code: 'edital_not_found' })).toMatchObject({ next: 'pages' })
    expect(failedReading({ code: 'edital_not_found' }, 'text')).toMatchObject({ next: null })
    expect(failedReading({ code: 'pdf_image' }).message).toContain('Cole o texto')
    expect(failedReading({ code: 'no_subjects' })).toMatchObject({ next: 'text' })
    expect(failedReading({ code: 'pages_out_of_range' })).toMatchObject({ next: 'pages' })
    expect(failedReading({ code: 'novo', message: 'Texto da API' }).message).toBe('Texto da API')
    expect(failedReading(null).message).toContain('Tente de novo')
  })

  it('429, 503, captcha, 422 e rede', () => {
    expect(submitFailure(httpError(429, { code: 'edital_public_ip_limit' }))).toMatchObject({ next: 'account', message: expect.stringContaining('Volte amanhã') })
    expect(submitFailure(httpError(429, { code: 'edital_public_ip_limit', message: 'Dois por dia. Crie uma conta.' })).message).toBe('Dois por dia. Crie uma conta.')
    expect(submitFailure(httpError(429, { code: 'edital_public_busy' })).message).toContain('Já estamos lendo')
    expect(submitFailure(httpError(503, { code: 'edital_public_daily_cap' })).message).toContain('Tente de novo amanhã')
    expect(submitFailure(httpError(503, { code: 'captcha_unavailable' }))).toMatchObject({ code: 'captcha_unavailable', message: expect.stringContaining('verificar agora') })
    expect(submitFailure(httpError(422, { errors: { file: ['O arquivo precisa ser um PDF.'] } })).message).toBe('O arquivo precisa ser um PDF.')
    expect(submitFailure(httpError(429, { code: 'rate_limited' })).message).toBe('Muitas tentativas. Espere um minuto.')
    expect(submitFailure(httpError(404)).message).toBe('Ferramenta indisponível no momento.')
    expect(failedReading({ code: 'unavailable', message: 'x' }).message).toBe('Não conseguimos ler agora. Tente de novo em instantes.')
    expect(submitFailure(httpError(413))).toMatchObject({ next: 'text' })
    expect(submitFailure(new Error('offline')).message).toContain('Sem conexão')
  })

  it('páginas do choose, em texto ou em intervalo', () => {
    expect(alternativePages('154-156')).toBe('Páginas 154 a 156')
    expect(alternativePages('7-7')).toBe('Página 7')
    expect(alternativePages({ from: 3, to: 9 })).toBe('Páginas 3 a 9')
    expect(alternativePages(null)).toBeNull()
  })

  it('contagem', () => {
    expect(countsLine(1, 1)).toBe('1 matéria · 1 assunto')
    expect(countsLine(12, 148)).toBe('12 matérias · 148 assuntos')
  })
})
