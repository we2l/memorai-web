#!/usr/bin/env node
// Resumo da auditoria de responsividade (e2e/responsivo/audit.ts): lê os JSON de cada aparelho e imprime em Markdown
// a contagem por aparelho × tela e os problemas agrupados pelo elemento (o mesmo componente em várias telas aparece
// uma vez, com onde aparece).
//   node e2e/responsivo/summary.mjs <pasta de saída> [--detalhe]
import fs from 'node:fs'
import path from 'node:path'

const dir = process.argv[2] || 'responsivo-output'
const detail = process.argv.includes('--detalhe')
const devices = fs.readdirSync(dir).filter(d => fs.statSync(path.join(dir, d)).isDirectory()).sort()

const KINDS = {
  overflowers: 'Rolagem horizontal',
  small: 'Toque < 44 px',
  zoomInputs: 'Campo < 16 px (zoom do iOS)',
  fixedOverlaps: 'Barras fixas sobrepostas',
  covered: 'Controle atrás de barra fixa',
  dialogs: 'Folha/diálogo maior que a tela',
  media: 'Mídia estourando',
  tinyText: 'Texto < 12 px',
}
const groups = Object.fromEntries(Object.keys(KINDS).map(k => [k, new Map()]))
const rows = []
for (const dev of devices) {
  for (const f of fs.readdirSync(path.join(dir, dev)).filter(f => f.endsWith('.json'))) {
    const { entries } = JSON.parse(fs.readFileSync(path.join(dir, dev, f), 'utf8'))
    for (const { name, report: r } of entries) {
      rows.push({ dev, name, ox: r.overflowX > 1 ? r.overflowX : 0, s24: r.small.filter(s => Math.min(s.box.w, s.box.h) < 24).length, s44: r.small.length, z: r.zoomInputs.length, fo: r.fixedOverlaps.length, cov: r.covered.length, dl: r.dialogs.length, md: r.media.length, tt: r.tinyText.length })
      for (const k of Object.keys(KINDS)) {
        for (const o of r[k]) {
          const key = k === 'fixedOverlaps' ? `${o.a}  ×  ${o.b}` : o.el.replace(/"[^"]*"$/, m => m.slice(0, 32))
          const g = groups[k].get(key) || { n: 0, where: new Set(), devs: new Set(), note: o.note ?? (o.area ? `${o.area} px²` : '') }
          g.n++; g.where.add(name); g.devs.add(dev)
          groups[k].set(key, g)
        }
      }
    }
  }
}

console.log(`# Resumo (${devices.length} aparelhos, ${rows.length} capturas)\n`)
console.log('| Problema | Ocorrências | Elementos distintos |\n|---|---|---|')
for (const [k, label] of Object.entries(KINDS)) {
  const g = groups[k]
  console.log(`| ${label} | ${[...g.values()].reduce((a, b) => a + b.n, 0)} | ${g.size} |`)
}
console.log('\n## Rolagem horizontal por tela\n')
const ox = rows.filter(r => r.ox)
console.log(ox.length ? ox.map(r => `- ${r.dev} · ${r.name}: ${r.ox} px`).join('\n') : '_nenhuma_')
for (const [k, label] of Object.entries(KINDS)) {
  const g = [...groups[k].entries()].sort((a, b) => b[1].n - a[1].n)
  if (!g.length) continue
  console.log(`\n## ${label}\n`)
  for (const [key, v] of g.slice(0, detail ? 200 : 25)) {
    console.log(`- \`${key.slice(0, 160)}\` (${v.note}) — ${v.n}× em ${v.devs.size} aparelho(s); telas: ${[...v.where].slice(0, 8).join(', ')}${v.where.size > 8 ? '…' : ''}`)
  }
}
