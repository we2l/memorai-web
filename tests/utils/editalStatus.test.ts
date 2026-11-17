import { describe, expect, it } from 'vitest'
import { editalStatus, editalToday, type EditalStatusInput } from '~/utils/editalStatus'

// prd-paginas-edital-publicas RF-W4: one state, the borders of every date (eve, day, day after) in São Paulo
const base = (edital: EditalStatusInput['edital'], extra: Partial<EditalStatusInput> = {}): EditalStatusInput => ({ edital, expires_on: null, status_override: null, status_date: null, ...extra })
const tjsp = base({ inscricoes_inicio: '2026-10-28', inscricoes_fim: '2026-12-10', prova: '2027-03-14' })

describe('editalStatus', () => {
  it('inscrições: antes de abrir, véspera, dia e dia seguinte do fim', () => {
    expect(editalStatus(tjsp, '2026-10-27')).toMatchObject({ state: 'inscricoes_a_abrir', label: 'Inscrições de 28/10 a 10/12', open: true })
    expect(editalStatus(tjsp, '2026-10-28')).toMatchObject({ state: 'inscricoes_abertas', label: 'Inscrições abertas até 10/12' })
    expect(editalStatus(tjsp, '2026-12-09').state).toBe('inscricoes_abertas')
    expect(editalStatus(tjsp, '2026-12-10').state).toBe('inscricoes_abertas')
    expect(editalStatus(tjsp, '2026-12-11')).toMatchObject({ state: 'inscricoes_encerradas', label: 'Inscrições encerradas · prova em 14/03', open: true })
  })

  it('prova: véspera e dia seguem abertos; o dia seguinte é prova_realizada (fora do índice)', () => {
    expect(editalStatus(tjsp, '2027-03-13').open).toBe(true)
    expect(editalStatus(tjsp, '2027-03-14').open).toBe(true)
    expect(editalStatus(tjsp, '2027-03-15')).toEqual({ state: 'prova_realizada', label: 'A prova foi em 14/03/2027', open: false })
  })

  it('prova prevista diz "prevista para"; sem inscrição só a prova; sem prova vence por expires_on', () => {
    expect(editalStatus(base({ inscricoes_fim: '2026-11-01', prova: '2027-03-14', prova_prevista: true }), '2026-11-20').label).toBe('Inscrições encerradas · prova prevista para 14/03')
    expect(editalStatus(base({ prova: '2027-03-14' }), '2026-11-20')).toMatchObject({ state: 'prova_a_frente', label: 'Prova em 14/03' })
    const noExam = base({}, { expires_on: '2027-01-31' })
    expect(editalStatus(noExam, '2027-01-31')).toMatchObject({ state: 'sem_data', open: true })
    expect(editalStatus(noExam, '2027-02-01')).toMatchObject({ state: 'prova_realizada', label: 'Encerrado em 31/01/2027', open: false })
  })

  it('suspenso e cancelado vencem a data', () => {
    expect(editalStatus({ ...tjsp, status_override: 'suspenso', status_date: '2026-11-20' }, '2026-11-01')).toEqual({ state: 'suspenso', label: 'Concurso suspenso em 20/11/2026', open: false })
    expect(editalStatus({ ...tjsp, status_override: 'cancelado' }, '2026-11-01')).toEqual({ state: 'cancelado', label: 'Concurso cancelado', open: false })
  })

  it('o dia é o de São Paulo: 02:30 UTC de 15/03 ainda é 14/03 lá', () => {
    expect(editalToday(new Date('2027-03-15T02:30:00Z'))).toBe('2027-03-14')
    expect(editalToday(new Date('2027-03-15T03:00:00Z'))).toBe('2027-03-15')
  })
})
