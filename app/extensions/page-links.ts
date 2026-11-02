import { Extension } from '@tiptap/core'
import { Plugin, PluginKey, type Transaction } from '@tiptap/pm/state'
import { Decoration, DecorationSet, type EditorView } from '@tiptap/pm/view'
import type { Node as PmNode } from '@tiptap/pm/model'

/**
 * "Ver no PDF" from the text (prd-4c-material-v3 RF-F2): the job that writes a PDF note ends each section
 * with `*(pág. X-Y)*`. This extension turns those markers into links, **only on screen**: decorations, so
 * the saved JSON never changes. The scan runs once when the note opens; an edit rescans only the text
 * blocks it touched (typing in a 300k-character note costs a block, not the document).
 * In reading mode a click (or Enter/Space on the focused link) opens the page; while editing, Ctrl/⌘+click.
 */

/** "(pág. 12-15)", "(págs. 3–4)", "(pag. 7)", "(p. 9)". Group 1: first page; group 2: last page. */
export const PAGE_REF = /\(\s*p(?:[áa]gs?)?\.?\s*(\d{1,4})(?:\s*[-–]\s*(\d{1,4}))?\s*\)/gi

export interface PageRef { from: number; to: number; page: number; end: number | null }

/** Page markers of a plain string, with offsets in that string. */
export function findPageRefs(text: string): PageRef[] {
  const out: PageRef[] = []
  PAGE_REF.lastIndex = 0
  for (const m of text.matchAll(PAGE_REF)) {
    const page = Number(m[1])
    if (!page) continue
    out.push({ from: m.index!, to: m.index! + m[0].length, page, end: m[2] ? Number(m[2]) : null })
  }
  return out
}

function decorationsOf(node: PmNode, pos: number): Decoration[] {
  const out: Decoration[] = []
  node.descendants((child, offset) => {
    if (!child.isText || !child.text) return
    for (const ref of findPageRefs(child.text)) {
      const at = pos + 1 + offset
      const pages = ref.end && ref.end !== ref.page ? `páginas ${ref.page} a ${ref.end}` : `página ${ref.page}`
      out.push(Decoration.inline(at + ref.from, at + ref.to, {
        'class': 'page-link',
        'data-page': String(ref.page),
        'role': 'link',
        'tabindex': '0',
        'aria-label': `Ver no PDF, ${pages}`,
      }))
    }
  })
  return out
}

function scan(doc: PmNode): DecorationSet {
  const all: Decoration[] = []
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true
    all.push(...decorationsOf(node, pos))
    return false
  })
  return DecorationSet.create(doc, all)
}

/** Ranges of the new document that the transaction changed. */
function changedRanges(tr: Transaction): [number, number][] {
  const out: [number, number][] = []
  tr.mapping.maps.forEach((map, i) => {
    const rest = tr.mapping.slice(i + 1)
    map.forEach((_a, _b, start, end) => { out.push([rest.map(start, -1), rest.map(end, 1)]) })
  })
  return out
}

function rescan(set: DecorationSet, tr: Transaction): DecorationSet {
  const doc = tr.doc
  let next = set.map(tr.mapping, doc)
  for (const [a, b] of changedRanges(tr)) {
    const from = Math.max(0, a - 1)
    const to = Math.min(doc.content.size, b + 1)
    doc.nodesBetween(from, to, (node, pos) => {
      if (!node.isTextblock) return true
      next = next.remove(next.find(pos, pos + node.nodeSize))
      next = next.add(doc, decorationsOf(node, pos))
      return false
    })
  }
  return next
}

const key = new PluginKey<DecorationSet>('pageLinks')

export interface PageLinksOptions {
  onOpen: (page: number) => void
}

function pageOf(target: EventTarget | null): number | null {
  const el = (target as HTMLElement | null)?.closest?.('[data-page]')
  const page = Number(el?.getAttribute('data-page'))
  return page > 0 ? page : null
}

export const PageLinks = Extension.create<PageLinksOptions>({
  name: 'pageLinks',

  addOptions() {
    return { onOpen: () => {} }
  },

  addProseMirrorPlugins() {
    const open = (view: EditorView, event: Event, viaKey = false) => {
      const page = pageOf(event.target)
      if (!page) return false
      const modified = (event as MouseEvent).ctrlKey || (event as MouseEvent).metaKey
      if (view.editable && !modified && !viaKey) return false
      event.preventDefault()
      this.options.onOpen(page)
      return true
    }
    return [
      new Plugin<DecorationSet>({
        key,
        state: {
          init: (_config, state) => scan(state.doc),
          apply: (tr, set) => (tr.docChanged ? rescan(set, tr) : set),
        },
        props: {
          decorations: state => key.getState(state),
          handleDOMEvents: {
            click: (view, event) => open(view, event),
            keydown: (view, event) => {
              if (view.editable || (event.key !== 'Enter' && event.key !== ' ')) return false
              return open(view, event, true)
            },
          },
        },
      }),
    ]
  },
})
