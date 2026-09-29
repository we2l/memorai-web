/** Topic tree → flat list in depth-first order (parent before its children). */
export function flattenTopics<T extends { children?: T[] | null }>(tree: T[]): T[] {
  const result: T[] = []
  for (const topic of tree) {
    result.push(topic)
    if (topic.children?.length) result.push(...flattenTopics(topic.children))
  }
  return result
}
