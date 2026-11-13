// Planilha do edital verticalizado (prd-edital-verticalizado-publico RF-F4): CSV with BOM and ";" so the Brazilian
// Excel opens the accents and the columns right. Built in the browser; the text comes from a visitor's edital, so a
// cell that would run as a formula gets a leading apostrophe.
import type { EditalProposal } from '~/types'
import { topicKey } from '~/utils/publicEdital'

const BOM = '﻿'
const HEADER = ['Matéria', 'Assunto', 'Item do edital', 'Estudado']

function cell(value: string | null | undefined): string {
  let v = (value ?? '').replace(/\r\n?/g, '\n')
  if (/^[=+@\t]|^-(?=\S)/.test(v)) v = `'${v}`
  return /[";\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
}

export function buildEditalCsv(proposal: EditalProposal, checked: ReadonlySet<string>): string {
  const rows = [HEADER.map(cell).join(';')]
  proposal.subjects.forEach((s, si) => {
    s.topics.forEach((t, ti) => {
      rows.push([s.name, t.name, t.description ?? '', checked.has(topicKey(si, ti)) ? 'sim' : 'não'].map(cell).join(';'))
    })
  })
  return `${BOM}${rows.join('\r\n')}\r\n`
}

/** edital-verticalizado-pm-pe-2026-soldado.csv */
export function editalCsvFileName(name: string | null | undefined): string {
  const slug = (name ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60).replace(/-+$/, '')
  return `edital-verticalizado${slug ? `-${slug}` : ''}.csv`
}

export function downloadEditalCsv(proposal: EditalProposal, checked: ReadonlySet<string>): void {
  const blob = new Blob([buildEditalCsv(proposal, checked)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = editalCsvFileName(proposal.name)
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
