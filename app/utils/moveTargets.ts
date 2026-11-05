import type { Topic } from '~/types'
import { MAX_SUBTOPIC_DEPTH } from '~/utils/scope'

/** What can be moved (prd-4b-caderno-v3 RF-B7): a matéria or assunto, a note, a PDF, or selected cards. */
export type MoveItem =
  | { kind: 'topic'; id: string; name: string; parentId: string | null }
  | { kind: 'note' | 'pdf'; id: string; name: string; topicId: string }
  | { kind: 'cards'; ids: string[]; topicIds: string[] }

/** The destination "a caderno of its own" (parent_id null), only for a matéria or assunto. */
export const NEW_CADERNO = 'new-caderno'

export interface MoveTarget {
  /** Topic id, or NEW_CADERNO */
  value: string
  name: string
  level: number
  /** Names from the caderno down to the parent, for the search results */
  path: string[]
  /** Why it cannot be chosen; undefined = can */
  reason?: string
}

function heightOf(node: Topic): number {
  return (node.children ?? []).reduce((h, c) => Math.max(h, heightOf(c) + 1), 0)
}

function idsOf(node: Topic): Set<string> {
  const ids = new Set<string>([node.id])
  for (const child of node.children ?? []) for (const id of idsOf(child)) ids.add(id)
  return ids
}

function findNode(tree: Topic[], id: string): Topic | null {
  for (const t of tree) {
    if (t.id === id) return t
    const hit = findNode(t.children ?? [], id)
    if (hit) return hit
  }
  return null
}

function reasonFor(item: MoveItem, node: Topic, depth: number, moving: Topic | null, inside: Set<string>): string | undefined {
  switch (item.kind) {
    case 'topic':
      if (node.id === item.id) return 'é o que você está movendo'
      if (inside.has(node.id)) return 'fica dentro do que você está movendo'
      if (node.id === item.parentId) return 'é o lugar atual'
      // The API counts the subtree that goes along (depth of the target + 1 + height of the subtree)
      if (depth + 1 + (moving ? heightOf(moving) : 0) > MAX_SUBTOPIC_DEPTH) return 'passaria de 2 níveis'
      return undefined
    case 'cards':
      return item.topicIds.length > 0 && item.topicIds.every(id => id === node.id) ? 'é o lugar atual' : undefined
    default:
      return node.id === item.topicId ? 'é o lugar atual' : undefined
  }
}

/**
 * The destinations of a move, in tree order: every caderno, matéria and assunto, the invalid ones with the reason
 * (RF-F15). The server has the last word: a stale tree gets its 422 explained by `organizationError`.
 */
export function moveTargets(tree: Topic[], item: MoveItem): MoveTarget[] {
  const moving = item.kind === 'topic' ? findNode(tree, item.id) : null
  const inside = moving ? idsOf(moving) : new Set<string>()
  const out: MoveTarget[] = []
  if (item.kind === 'topic' && item.parentId) {
    out.push({ value: NEW_CADERNO, name: 'Virar um caderno', level: 0, path: [] })
  }
  const walk = (nodes: Topic[], depth: number, path: string[]) => {
    for (const node of nodes) {
      out.push({ value: node.id, name: node.name, level: depth, path, reason: reasonFor(item, node, depth, moving, inside) })
      walk(node.children ?? [], depth + 1, [...path, node.name])
    }
  }
  walk(tree, 0, [])
  return out
}

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('pt-BR')

/** The search of the dialog: by name, ignoring accents and case. */
export function filterTargets(targets: MoveTarget[], q: string): MoveTarget[] {
  const term = fold(q.trim())
  if (!term) return targets
  return targets.filter(t => fold(t.name).includes(term))
}
