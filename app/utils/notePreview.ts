/**
 * Extracts a structured preview from Tiptap JSON content.
 * Returns an array of preview blocks (heading, paragraph, listItem)
 * limited to ~3 lines worth of content.
 */

interface PreviewBlock {
  type: 'heading' | 'paragraph' | 'listItem'
  text: string
}

/**
 * Extract structured preview from Tiptap content JSON.
 * Preserves document structure (headings, paragraphs, bullets) for the first ~200 chars.
 */
export function extractStructuredPreview(content: Record<string, any> | null, maxChars = 200): PreviewBlock[] {
  if (!content?.content) return []

  const blocks: PreviewBlock[] = []
  let charCount = 0

  for (const node of content.content) {
    if (charCount >= maxChars) break

    const text = getNodeText(node).trim()
    if (!text) continue

    if (node.type === 'heading') {
      const truncated = truncateAtBoundary(text, maxChars - charCount)
      blocks.push({ type: 'heading', text: truncated })
      charCount += truncated.length
    } else if (node.type === 'bulletList' || node.type === 'orderedList') {
      for (const item of (node.content || [])) {
        if (charCount >= maxChars) break
        const itemText = getNodeText(item).trim()
        if (!itemText) continue
        const truncated = truncateAtBoundary(itemText, maxChars - charCount)
        blocks.push({ type: 'listItem', text: truncated })
        charCount += truncated.length
      }
    } else if (node.type === 'paragraph') {
      const truncated = truncateAtBoundary(text, maxChars - charCount)
      blocks.push({ type: 'paragraph', text: truncated })
      charCount += truncated.length
    }
  }

  return blocks
}

/**
 * Count real words from Tiptap content (accurate, not estimated).
 * Returns null if content is not available.
 */
export function countWordsFromContent(content: Record<string, any> | null): number | null {
  if (!content?.content) return null
  const text = getNodeText(content).trim()
  if (!text) return null
  return text.split(/\s+/).filter(Boolean).length
}

function getNodeText(node: any): string {
  if (node.text) return node.text
  if (!node.content) return ''
  return node.content.map((child: any) => getNodeText(child)).join('')
}

function truncateAtBoundary(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text

  // Try to break at sentence boundary
  const sub = text.slice(0, maxLen)
  const lastPeriod = sub.lastIndexOf('. ')
  if (lastPeriod > maxLen * 0.5) return sub.slice(0, lastPeriod + 1)

  // Try to break at word boundary
  const lastSpace = sub.lastIndexOf(' ')
  if (lastSpace > maxLen * 0.6) return sub.slice(0, lastSpace) + '…'

  return sub + '…'
}
