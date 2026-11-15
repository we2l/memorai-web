// The mascot as one static SVG per state (public/mascote/<estado>.svg), their sizes (app/assets/mascote/estados.json)
// and their cut in the rig's viewBox (recortes.json),
// drawn from the rig (app/assets/mascote: mascote.svg = the parts, mascote.json = the states, rig.js = how a state
// sets the parts). A static file goes in an <img>: no script, no clash of ids between two dolphins on a page, cached,
// outside the route budgets. Each file keeps only what its state shows, with a viewBox cut to the drawing.
// The files are committed (the Vercel build has no browser). Run after changing the art or a state:
//   node scripts/mascote-svgs.mjs
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = path.join(root, 'app/assets/mascote')
const outDir = path.join(root, 'public/mascote')

const svg = fs.readFileSync(path.join(src, 'mascote.svg'), 'utf8')
const rig = fs.readFileSync(path.join(src, 'rig.js'), 'utf8').replace(/^export const MASCOTE/m, 'window.MASCOTE')
const { estados } = JSON.parse(fs.readFileSync(path.join(src, 'mascote.json'), 'utf8'))

// t where the breathing is at rest (scale 1) and the tail almost straight; the eyelid is opened by hand below
const T = 2.55
const PAD = 4

const browser = await chromium.launch()
const page = await browser.newPage()
await page.setContent('<!doctype html><html><body></body></html>')
await page.addScriptTag({ content: rig })

fs.mkdirSync(outDir, { recursive: true })
const sizes = {}
const cuts = {}
for (const [name, state] of Object.entries(estados)) {
  const out = await page.evaluate(({ state, T, PAD, svg }) => {
    // Every state starts from the untouched art (the cleanup below removes what the rig reads)
    document.body.innerHTML = svg
    const root = document.querySelector('svg')
    window.MASCOTE.desenhar(root, { t: T, de: state, para: state, p: 1, fala: null, olhar: null, semente: 1 })
    // A still picture never catches the dolphin mid-blink
    root.querySelectorAll('.lid').forEach(e => { e.style.transform = 'scaleY(0.001)' })

    // The box of what is on screen, in viewBox units (getBoundingClientRect follows every transform)
    const vb = root.viewBox.baseVal
    const box = root.getBoundingClientRect()
    const k = vb.width / box.width
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
    root.querySelectorAll('path, ellipse, circle, rect, use, polygon, line').forEach((e) => {
      if (e.closest('defs, clipPath')) return
      if (getComputedStyle(e).display === 'none' || e.closest('[style*="display: none"]')) return
      const r = e.getBoundingClientRect()
      if (!r.width && !r.height) return
      x0 = Math.min(x0, r.left); y0 = Math.min(y0, r.top); x1 = Math.max(x1, r.right); y1 = Math.max(y1, r.bottom)
    })
    const vx = vb.x + (x0 - box.left) * k - PAD, vy = vb.y + (y0 - box.top) * k - PAD
    const vw = (x1 - x0) * k + 2 * PAD, vh = (y1 - y0) * k + 2 * PAD

    // Only what this state shows: hidden parts, the pose references of the rig and the comments go
    root.querySelectorAll('*').forEach((e) => {
      if (!e.isConnected || e.closest('defs')) return
      if (e.style.display === 'none' || getComputedStyle(e).display === 'none') e.remove()
    })
    root.querySelectorAll('.far-shape, .near-shape').forEach(e => e.remove())
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_COMMENT)
    const comments = []
    while (walker.nextNode()) comments.push(walker.currentNode)
    comments.forEach(c => c.remove())
    root.querySelectorAll('[data-pivot], [data-ang], [data-name], [data-for], [data-front]').forEach((e) => {
      ['data-pivot', 'data-ang', 'data-name', 'data-for', 'data-front'].forEach(a => e.removeAttribute(a))
    })
    const r = n => Math.round(n * 10) / 10
    root.setAttribute('viewBox', `${r(vx)} ${r(vy)} ${r(vw)} ${r(vh)}`)
    root.setAttribute('width', String(Math.round(vw)))
    root.setAttribute('height', String(Math.round(vh)))
    return { svg: root.outerHTML, w: Math.round(vw), h: Math.round(vh), vb: [r(vx), r(vy), r(vw), r(vh)] }
  }, { state, T, PAD, svg })

  const text = `<?xml version="1.0" encoding="UTF-8"?>\n${out.svg.replace(/>\s+</g, '><').replace(/\s{2,}/g, ' ')}\n`
  fs.writeFileSync(path.join(outDir, `${name}.svg`), text)
  sizes[name] = { w: out.w, h: out.h }
  // The cut of this expression in the rig's viewBox: only the animated dolphin (UiBaigiMascotLive) reads it
  cuts[name] = out.vb
  console.log(`${name.padEnd(12)} ${out.w}×${out.h}  ${(Buffer.byteLength(text) / 1024).toFixed(1)} KB`)
}
await browser.close()

fs.writeFileSync(path.join(src, 'estados.json'), JSON.stringify(sizes) + '\n')
fs.writeFileSync(path.join(src, 'recortes.json'), JSON.stringify(cuts) + '\n')
