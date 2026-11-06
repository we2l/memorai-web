/**
 * "Nesta parte" of the material (prd-4c-material-v3 RF-F3): the H1–H3 of the open note, read from the JSON
 * already loaded (no request), and the heading on screen while the reader scrolls (IntersectionObserver).
 * The outline is read when the note opens and after each save, never per keystroke.
 */

export interface OutlineHeading {
  /** Position among the H1–H3 of the document: the same index as `.ProseMirror :is(h1,h2,h3)` */
  index: number
  level: 1 | 2 | 3
  text: string
}

type JsonNode = { type?: string; text?: string; attrs?: { level?: number }; content?: JsonNode[] }

function textOf(node: JsonNode): string {
  if (node.text) return node.text
  return (node.content ?? []).map(textOf).join('')
}

/** Headings H1–H3 of a Tiptap document, in order (nested ones too: callouts, quotes). */
export function outlineOf(doc: JsonNode | null | undefined): OutlineHeading[] {
  const out: OutlineHeading[] = []
  const walk = (nodes: JsonNode[] | undefined) => {
    for (const node of nodes ?? []) {
      if (node.type === 'heading') {
        const level = node.attrs?.level ?? 1
        if (level <= 3) out.push({ index: out.length, level: level as 1 | 2 | 3, text: textOf(node).trim() || 'Sem título' })
        continue
      }
      if (node.content && node.type !== 'paragraph') walk(node.content)
    }
  }
  walk(doc?.content)
  return out
}

const HEADINGS = ':is(h1, h2, h3)'

/**
 * Tracks the heading on screen inside `root` (the reader) and scrolls to one. `observe()` is called when
 * the editor has drawn the note (and again after the content changes from outside).
 */
export function useNoteOutline(root: Ref<HTMLElement | null | undefined>) {
  const active = ref<number | null>(null)
  let observer: IntersectionObserver | null = null
  let elements: HTMLElement[] = []
  const visible = new Set<number>()

  function disconnect() {
    observer?.disconnect()
    observer = null
    visible.clear()
  }

  function observe() {
    disconnect()
    if (!import.meta.client || !root.value || typeof IntersectionObserver === 'undefined') return
    elements = [...root.value.querySelectorAll<HTMLElement>(`.ProseMirror ${HEADINGS}`)]
    if (!elements.length) return
    // The band under the top bar: a heading counts as "here" while it is in the upper third
    observer = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const i = elements.indexOf(e.target as HTMLElement)
        if (i === -1) continue
        if (e.isIntersecting) visible.add(i)
        else visible.delete(i)
      }
      if (visible.size) active.value = Math.min(...visible)
    }, { rootMargin: '-64px 0px -66% 0px' })
    for (const el of elements) observer.observe(el)
  }

  /** Scrolls to the heading and puts the focus on it (headings carry tabindex="-1"). */
  function goTo(index: number) {
    const el = root.value?.querySelectorAll<HTMLElement>(`.ProseMirror ${HEADINGS}`)[index]
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    el.focus({ preventScroll: true })
    active.value = index
  }

  onScopeDispose(disconnect)

  return { active, observe, goTo, disconnect }
}
