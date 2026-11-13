import { describe, expect, it } from 'vitest'
import type { EditalProposal } from '~/types'
import { buildEditalCsv, editalCsvFileName } from '~/utils/editalCsv'

const PROPOSAL: EditalProposal = {
  name: 'PM-PE 2026 · Soldado',
  exam_date: null,
  subjects: [
    { name: 'Língua Portuguesa', topics: [{ name: 'Crase; regência', description: '1 "Crase" e\nregência' }, { name: 'Pontuação', description: null }] },
    { name: 'Direito', topics: [{ name: '=SOMA(A1)', description: '-1 item' }, { name: '- lei', description: '- lei' }] },
  ],
}

describe('editalCsv', () => {
  const csv = buildEditalCsv(PROPOSAL, new Set(['0.1']))
  const lines = csv.split('\r\n')

  it('BOM UTF-8, separador ; e cabeçalho', () => {
    expect(csv.startsWith('﻿')).toBe(true)
    expect(lines[0]).toBe('﻿Matéria;Assunto;Item do edital;Estudado')
  })

  it('acento intacto, ; e aspas escapados, quebra de linha dentro da célula', () => {
    expect(csv).toContain('Língua Portuguesa;"Crase; regência";"1 ""Crase"" e\nregência";não')
  })

  it('estudado é sim ou não, descrição vazia vira célula vazia', () => {
    expect(csv).toContain('Língua Portuguesa;Pontuação;;sim')
  })

  it('texto que viraria fórmula ganha apóstrofo; marcador "- " não', () => {
    expect(csv).toContain("Direito;'=SOMA(A1);'-1 item;não")
    expect(csv).toContain('Direito;- lei;- lei;não')
  })

  it('termina em quebra de linha e nome de arquivo sem acento', () => {
    expect(csv.endsWith('\r\n')).toBe(true)
    expect(editalCsvFileName('PM-PE 2026 · Soldado')).toBe('edital-verticalizado-pm-pe-2026-soldado.csv')
    expect(editalCsvFileName('Câmara Municipal / Técnico')).toBe('edital-verticalizado-camara-municipal-tecnico.csv')
    expect(editalCsvFileName('')).toBe('edital-verticalizado.csv')
  })
})
