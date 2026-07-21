/**
 * Composable para converter documentos Tiptap JSON em HTML ou texto puro.
 * Util sem estado — não usa refs ou lifecycle hooks.
 */
export function useTiptapRender() {
  function toHtml(doc: any): string {
    if (!doc) return ''
    if (typeof doc === 'string') return doc

    if (doc.type === 'doc' && doc.content) {
      return doc.content.map((n: any) => renderNode(n)).join('')
    }

    return renderNode(doc)
  }

  function toText(doc: any): string {
    if (!doc) return ''
    if (typeof doc === 'string') return doc
    let text = ''
    if (doc.text) text += doc.text
    if (doc.content) {
      for (const node of doc.content) {
        text += toText(node)
        if (node.type === 'paragraph' || node.type === 'heading') text += '\n'
      }
    }
    return text.trim()
  }

  function renderNode(node: any): string {
    if (!node) return ''

    switch (node.type) {
      case 'heading': {
        const level = node.attrs?.level ?? 2
        return `<h${level}>${renderChildren(node)}</h${level}>`
      }
      case 'paragraph':
        return `<p>${renderChildren(node)}</p>`
      case 'bulletList':
        return `<ul>${renderChildren(node)}</ul>`
      case 'orderedList':
        return `<ol>${renderChildren(node)}</ol>`
      case 'listItem':
        return `<li>${renderChildren(node)}</li>`
      case 'callout': {
        const calloutType = node.attrs?.type || 'info'
        return `<div class="callout callout-${calloutType}">${renderChildren(node)}</div>`
      }
      case 'blockquote':
        return `<blockquote>${renderChildren(node)}</blockquote>`
      case 'image':
        return `<img src="${node.attrs?.src}" alt="${node.attrs?.alt || ''}" />`
      case 'text': {
        let text = escapeHtml(node.text || '')
        if (node.marks) {
          for (const mark of node.marks) {
            if (mark.type === 'bold') text = `<strong>${text}</strong>`
            else if (mark.type === 'italic') text = `<em>${text}</em>`
            else if (mark.type === 'code') text = `<code>${text}</code>`
          }
        }
        return text
      }
      default:
        return renderChildren(node)
    }
  }

  function renderChildren(node: any): string {
    if (!node.content) return node.text ? escapeHtml(node.text) : ''
    return node.content.map((child: any) => renderNode(child)).join('')
  }

  function escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
  }

  return { toHtml, toText }
}
