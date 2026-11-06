import type { Page } from '@playwright/test'

/**
 * Checagens de responsividade que rodam dentro da página (prd-responsividade RF-1). Mesma função na auditoria
 * local (audit.ts, com a API) e no spec leve do CI (e2e/responsivo.spec.ts, com o HAR).
 *
 * - overflowX: quanto a página rola para o lado (scrollWidth - innerWidth) e quem passa da borda;
 * - small: alvos de toque com o lado menor que 44 px (24 px é o mínimo do WCAG 2.5.8; 44 é o do projeto);
 *   links no meio do texto ficam de fora (exceção do próprio WCAG);
 * - zoomInputs: campos com fonte menor que 16 px (o Safari do iOS dá zoom ao focar);
 * - fixedOverlaps: barras fixas que se cobrem (navegação, mini-player, barra da página, aviso de cookies);
 * - covered: controles da tela cobertos por uma barra fixa, no topo e no fim da rolagem;
 * - dialogs: folha ou diálogo maior que a tela, ou com conteúdo cortado sem rolagem interna;
 * - media: imagem, vídeo, canvas ou iframe mais largos que a tela;
 * - tinyText: texto com menos de 12 px.
 */
export interface Box { x: number; y: number; w: number; h: number }
export interface Offender { el: string; box: Box; note?: string }
export interface ResponsiveReport {
  url: string
  viewport: { w: number; h: number }
  overflowX: number
  overflowers: Offender[]
  small: Offender[]
  zoomInputs: Offender[]
  fixedOverlaps: { a: string; b: string; area: number }[]
  covered: Offender[]
  dialogs: Offender[]
  media: Offender[]
  tinyText: Offender[]
}

export async function inspect(page: Page, opts: { coverage?: boolean } = {}): Promise<ResponsiveReport> {
  const base = await page.evaluate(collect, { phase: 'top' as const })
  if (opts.coverage === false) return base
  // Fim da rolagem: o último controle não pode ficar atrás da barra inferior, do mini-player ou da barra fixa
  const atBottom = await page.evaluate(collect, { phase: 'bottom' as const })
  base.covered = atBottom.covered
  const pairs = new Set(base.fixedOverlaps.map(o => `${o.a}|${o.b}`))
  for (const o of atBottom.fixedOverlaps) if (!pairs.has(`${o.a}|${o.b}`)) base.fixedOverlaps.push(o)
  return base
}

/** Só os problemas (para asserts e para o resumo). */
export function problems(r: ResponsiveReport) {
  return {
    overflowX: r.overflowX > 1 ? r.overflowX : 0,
    small24: r.small.filter(s => Math.min(s.box.w, s.box.h) < 24).length,
    small44: r.small.length,
    zoomInputs: r.zoomInputs.length,
    fixedOverlaps: r.fixedOverlaps.length,
    covered: r.covered.length,
    dialogs: r.dialogs.length,
    media: r.media.length,
    tinyText: r.tinyText.length,
  }
}

// Runs in the browser: no closures, no imports.
function collect({ phase }: { phase: 'top' | 'bottom' }): ResponsiveReport {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const de = document.documentElement
  if (phase === 'bottom') window.scrollTo(0, de.scrollHeight)
  else window.scrollTo(0, 0)

  const r2 = (n: number) => Math.round(n)
  const boxOf = (r: DOMRect): Box => ({ x: r2(r.left), y: r2(r.top + window.scrollY), w: r2(r.width), h: r2(r.height) })
  const name = (el: Element): string => {
    const h = el as HTMLElement
    const tid = h.dataset?.testid ? `[data-testid=${h.dataset.testid}]` : ''
    const label = el.getAttribute('aria-label') || (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40)
    const cls = typeof h.className === 'string' ? h.className.split(/\s+/).filter(Boolean).slice(0, 4).join('.') : ''
    const own = `${el.tagName.toLowerCase()}${tid}${cls ? '.' + cls : ''}`
    const parent = el.parentElement ? el.parentElement.tagName.toLowerCase() : ''
    return `${parent} > ${own}${label ? ` "${label}"` : ''}`
  }
  const shown = (el: Element) => {
    const cs = getComputedStyle(el)
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false
    const r = el.getBoundingClientRect()
    return r.width > 0 && r.height > 0
  }
  const clipsX = (el: Element) => {
    const cs = getComputedStyle(el)
    return ['hidden', 'auto', 'scroll', 'clip'].includes(cs.overflowX)
  }
  // An ancestor (below <body>) that clips or scrolls sideways contains the element
  const clipped = (el: Element) => {
    for (let p = el.parentElement; p && p !== document.body && p !== de; p = p.parentElement) if (clipsX(p)) return true
    return false
  }
  const srOnly = (el: Element) => {
    const r = el.getBoundingClientRect()
    return r.width <= 2 && r.height <= 2
  }

  // ── Rolagem horizontal ──
  const overflowX = Math.max(de.scrollWidth, document.body.scrollWidth) - vw
  const overflowers: Offender[] = []
  if (overflowX > 1) {
    const out = Array.from(document.body.querySelectorAll('*')).filter((el) => {
      const r = el.getBoundingClientRect()
      return r.width > 0 && (r.right > vw + 1 || r.left < -1) && shown(el) && !clipped(el)
    })
    // The innermost ones say why: a wide wrapper is only wide because of what is inside it
    const leaves = out.filter(el => !out.some(o => o !== el && el.contains(o)))
    for (const el of leaves.slice(0, 8)) {
      const r = el.getBoundingClientRect()
      overflowers.push({ el: name(el), box: boxOf(r), note: `de ${r2(r.left)} a ${r2(r.right)} px` })
    }
  }

  // ── Alvos de toque ──
  const INTERACTIVE = 'a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [role=link], [role=tab], [role=menuitem], [role=menuitemradio], [role=option], [role=switch], [role=checkbox], [role=radio], [role=slider]'
  const small: Offender[] = []
  // The touch area counts the ::before/::after stretched around it (UiButton/UiIconButton sm, UiSwitch: before:-inset-*)
  const hit = (el: Element, r: DOMRect) => {
    let w = r.width, h = r.height
    if (getComputedStyle(el).position === 'static') return { w, h }
    for (const ps of ['::before', '::after']) {
      const p = getComputedStyle(el, ps)
      if (p.content === 'none' || p.content === 'normal' || p.position !== 'absolute' || p.display === 'none') continue
      const px = (v: string) => (v.endsWith('px') ? parseFloat(v) : Number.NaN)
      const [t, rr, b, l] = [p.top, p.right, p.bottom, p.left].map(px) as [number, number, number, number]
      let pw = parseFloat(p.width), ph = parseFloat(p.height)
      if (!Number.isNaN(l) && !Number.isNaN(rr)) pw = r.width - l - rr
      if (!Number.isNaN(t) && !Number.isNaN(b)) ph = r.height - t - b
      if (pw > w) w = pw
      if (ph > h) h = ph
    }
    return { w, h }
  }
  const seenSmall = new Set<string>()
  for (const el of Array.from(document.querySelectorAll(INTERACTIVE))) {
    if (el.closest('[contenteditable=true], .ProseMirror, [aria-hidden=true], [inert]')) continue
    if ((el as HTMLButtonElement).disabled) continue
    let target: Element = el
    let rect = el.getBoundingClientRect()
    const type = el.getAttribute('type')
    if (el.tagName === 'INPUT' && (type === 'checkbox' || type === 'radio')) {
      // The label toggles it too: the touch area is the input plus its label
      const id = el.getAttribute('id')
      const label = el.closest('label') || (id ? document.querySelector(`label[for="${CSS.escape(id)}"]`) : null)
      if (label && shown(label)) {
        const l = label.getBoundingClientRect()
        const left = Math.min(l.left, rect.width > 2 ? rect.left : l.left), right = Math.max(l.right, rect.width > 2 ? rect.right : l.right)
        const top = Math.min(l.top, rect.height > 2 ? rect.top : l.top), bottom = Math.max(l.bottom, rect.height > 2 ? rect.bottom : l.bottom)
        rect = new DOMRect(left, top, right - left, bottom - top)
        target = el.closest('label') ? label : el
      } else if (srOnly(el)) continue
    } else if (srOnly(el)) continue
    if (!shown(target)) continue
    const cs = getComputedStyle(target)
    // Inline links inside a sentence (WCAG 2.5.8 exception)
    if (target.tagName === 'A' && cs.display === 'inline') {
      const p = target.parentElement
      const text = p ? Array.from(p.childNodes).some(n => n.nodeType === 3 && (n.textContent || '').trim().length > 0) : false
      if (text) continue
    }
    // An interactive element inside another one counts as the outer (a row link with an icon, a label with its input)
    const outer = target.parentElement?.closest(INTERACTIVE)
    if (outer && outer !== target && shown(outer)) {
      const o = hit(outer, outer.getBoundingClientRect())
      if (Math.min(o.w, o.h) >= 44) continue
    }
    const size = hit(target, rect)
    if (Math.min(size.w, size.h) >= 44) continue
    const r = rect
    const key = `${name(target)}|${r2(r.width)}x${r2(r.height)}`
    if (seenSmall.has(key)) continue
    seenSmall.add(key)
    small.push({ el: name(target), box: { ...boxOf(r), w: r2(size.w), h: r2(size.h) }, note: `${r2(size.w)}×${r2(size.h)}` })
  }

  // ── Fonte dos campos (zoom do iOS) ──
  const zoomInputs: Offender[] = []
  for (const el of Array.from(document.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=range]):not([type=file]), select, textarea, [contenteditable=true]'))) {
    if (!shown(el) || srOnly(el)) continue
    const fs = parseFloat(getComputedStyle(el).fontSize)
    if (fs < 16) zoomInputs.push({ el: name(el), box: boxOf(el.getBoundingClientRect()), note: `${fs}px` })
  }

  // ── Barras fixas que se cobrem ──
  const fixed = Array.from(document.body.querySelectorAll('*')).filter((el) => {
    const cs = getComputedStyle(el)
    if (cs.position !== 'fixed' && cs.position !== 'sticky') return false
    if (!shown(el) || cs.pointerEvents === 'none') return false
    const r = el.getBoundingClientRect()
    // The scrim of a dialog covers everything by design
    if (r.width >= vw - 1 && r.height >= vh - 1) return false
    return r.bottom > 0 && r.top < vh
  })
  const fixedOverlaps: { a: string; b: string; area: number }[] = []
  for (let i = 0; i < fixed.length; i++) {
    for (let j = i + 1; j < fixed.length; j++) {
      const a = fixed[i]!, b = fixed[j]!
      if (a.contains(b) || b.contains(a)) continue
      const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect()
      const w = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left)
      const h = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top)
      if (w > 2 && h > 2) fixedOverlaps.push({ a: name(a), b: name(b), area: r2(w * h) })
    }
  }

  // ── Controles cobertos por uma barra fixa (no viewport atual) ──
  const covered: Offender[] = []
  // Only at the end of the scroll: above it, content passing under the bars is expected
  const checkCovered = phase === 'bottom'
  const fixedSet = new Set(fixed)
  const inFixed = (el: Element | null) => {
    for (let p = el; p; p = p.parentElement) if (fixedSet.has(p)) return p
    return null
  }
  for (const el of checkCovered ? Array.from(document.querySelectorAll(INTERACTIVE)) : []) {
    if (!shown(el) || srOnly(el) || inFixed(el)) continue
    if (el.closest('[aria-hidden=true], [inert]')) continue
    const r = el.getBoundingClientRect()
    if (r.bottom <= 0 || r.top >= vh || r.right <= 0 || r.left >= vw) continue
    const cx = Math.min(Math.max(r.left + r.width / 2, 1), vw - 1)
    const cy = Math.min(Math.max(r.top + r.height / 2, 1), vh - 1)
    const top = document.elementFromPoint(cx, cy)
    if (!top || el.contains(top) || top.contains(el)) continue
    const bar = inFixed(top)
    // Only the bars at the bottom (BottomNav, mini-player, page bar, cookies): a sticky header covering what scrolled
    // past it is expected
    if (bar && !bar.contains(el) && bar.getBoundingClientRect().top > vh / 2) covered.push({ el: name(el), box: boxOf(r), note: `atrás de ${name(bar).slice(0, 80)}` })
    if (covered.length >= 8) break
  }

  // ── Folhas e diálogos ──
  const dialogs: Offender[] = []
  for (const el of Array.from(document.querySelectorAll('[role=dialog][aria-modal=true], [role=alertdialog]'))) {
    if (!shown(el)) continue
    const r = el.getBoundingClientRect()
    if (r.top < -1 || r.bottom > vh + 1 || r.left < -1 || r.right > vw + 1) {
      dialogs.push({ el: name(el), box: boxOf(r), note: `fora da tela (${r2(r.top)}..${r2(r.bottom)} de ${vh})` })
      continue
    }
    if (el.scrollHeight > el.clientHeight + 2) {
      const scroller = Array.from(el.querySelectorAll('*')).some((k) => {
        const oy = getComputedStyle(k).overflowY
        return (oy === 'auto' || oy === 'scroll') && k.scrollHeight > k.clientHeight
      })
      if (!scroller) dialogs.push({ el: name(el), box: boxOf(r), note: 'conteúdo cortado sem rolagem interna' })
    }
  }

  // ── Mídia ──
  const media: Offender[] = []
  for (const el of Array.from(document.querySelectorAll('img, video, canvas, iframe, svg'))) {
    if (el.tagName.toLowerCase() === 'svg' && el.parentElement?.closest('svg')) continue
    if (!shown(el)) continue
    const r = el.getBoundingClientRect()
    if (r.width < 40) continue
    if ((r.right > vw + 1 || r.left < -1) && !clipped(el)) media.push({ el: name(el), box: boxOf(r), note: `${r2(r.width)} px de largura` })
  }

  // ── Texto pequeno demais ──
  const tinyText: Offender[] = []
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  const tinySeen = new Set<Element>()
  for (let n = walker.nextNode(); n && tinyText.length < 10; n = walker.nextNode()) {
    const p = n.parentElement
    if (!p || tinySeen.has(p) || !(n.textContent || '').trim()) continue
    tinySeen.add(p)
    if (!shown(p) || srOnly(p) || p.closest('svg, [aria-hidden=true]')) continue
    const fs = parseFloat(getComputedStyle(p).fontSize)
    if (fs < 12) tinyText.push({ el: name(p), box: boxOf(p.getBoundingClientRect()), note: `${fs}px` })
  }

  window.scrollTo(0, 0)
  return { url: location.pathname + location.search, viewport: { w: vw, h: vh }, overflowX, overflowers, small, zoomInputs, fixedOverlaps, covered, dialogs, media, tinyText }
}
