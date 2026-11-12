/**
 * Topic tree helpers of the practice sheets (questions, episodes) and Praticar: kept apart from utils/topics.ts,
 * which Hoje and the shell load.
 */
/**
 * Options of a scope select in tree order, indented by depth with non-breaking spaces (the "— — " prefix read as
 * noise in the styled list, owner's review of 12/11/2026). `maxDepth` cuts
 * deeper levels (the simulado do caderno takes a caderno or a matéria).
 */
export function topicTreeOptions<T extends { id: string; name: string; children?: T[] | null }>(tree: T[], maxDepth = Infinity): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = []
  const walk = (topics: T[], depth: number) => {
    for (const t of topics) {
      out.push({ value: t.id, label: `${'\u00A0'.repeat(depth * 4)}${t.name}` })
      if (t.children?.length && depth < maxDepth) walk(t.children, depth + 1)
    }
  }
  walk(tree, 0)
  return out
}

/** Sum of a numeric field over a topic and its whole subtree (the tree counts only direct notes/cards). */
export function subtreeSum<T extends { children?: T[] | null }>(topic: T, field: (t: T) => number): number {
  return field(topic) + (topic.children ?? []).reduce((acc, c) => acc + subtreeSum(c, field), 0)
}
