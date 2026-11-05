import type { Ref } from 'vue'
import { escapeHtml } from '~/utils/escapeHtml'

export interface MindMapNode {
  content: string
  children: MindMapNode[]
  payload?: { type?: string; [key: string]: unknown }
}

// markmap paints with attributes, which do not resolve var(): the tokens are read when drawing
const NODE_TOKENS: Record<string, string> = {
  conceito: '--action-fg',
  definição: '--state-info',
  exemplo: '--state-success',
  exceção: '--state-danger',
  referência: '--fg-muted',
}

const DEPTH_TOKENS = ['--subject-1', '--subject-2', '--subject-3', '--subject-7', '--subject-4']

export function useMindMap(
  containerRef: Ref<HTMLElement | null>,
  options: {
    colorByType?: boolean
    /** Colors by depth instead of the tokens (the landing, with a palette of its own until phase 4h) */
    depthColors?: string[]
    onNodeClick?: (node: MindMapNode) => void
  } = {},
) {
  let mm: any = null

  async function render(data: MindMapNode | null) {
    const container = containerRef.value
    if (!container || !data) return

    // Lazy import markmap-view
    const { Markmap } = await import('markmap-view')

    // Clear previous instance
    if (mm) {
      mm.destroy?.()
      mm = null
    }
    container.innerHTML = ''

    // Create SVG
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('style', 'width: 100%; height: 100%;')
    container.appendChild(svg)

    const styles = getComputedStyle(container)

    // Responsive spacing
    const width = container.clientWidth
    const isMobile = width < 768
    const isTablet = width >= 768 && width < 1024

    const spacingHorizontal = isMobile ? 40 : isTablet ? 60 : 80
    const maxWidth = isMobile ? 180 : isTablet ? 250 : 300
    const initialExpandLevel = isMobile ? 1 : 2

    mm = new Markmap(svg, {
      zoom: true,
      pan: true,
      scrollForPan: false,
      initialExpandLevel,
      duration: 500,
      maxWidth,
      spacingHorizontal,
      spacingVertical: 16,
      paddingX: 8,
      color: (node: any) => {
        if (options.depthColors) return options.depthColors[Math.min(node.state.depth, options.depthColors.length - 1)]!
        const token = (options.colorByType && NODE_TOKENS[node.payload?.type]) || DEPTH_TOKENS[Math.min(node.state.depth, DEPTH_TOKENS.length - 1)]!
        return styles.getPropertyValue(token).trim()
      },
      lineWidth: (node: any) => Math.max(1, 2.5 - node.state.depth * 0.4),
    })

    // markmap renders `content` as HTML: escape user/AI text, keep the original in payload.raw
    const instance = mm
    await instance.setData(escapeTree(data))
    // Unmounted (or rendered again) while the data was being laid out: that instance is gone
    if (mm !== instance) return
    mm.fit()

    // Add click listeners for nodes (Nível 2 actions)
    if (options.onNodeClick) {
      svg.addEventListener('click', (e: Event) => {
        const target = (e.target as Element)?.closest?.('g.markmap-node')
        if (!target) return
        const textEl = target.querySelector('foreignObject span, text')
        if (!textEl) return
        const content = textEl.textContent?.trim() ?? ''
        const node = findNodeByContent(data, content)
        if (node) options.onNodeClick!(node)
      })
    }
  }

  function fit() {
    mm?.fit()
  }

  function destroy() {
    mm?.destroy?.()
    mm = null
  }

  return { render, fit, destroy }
}

export function escapeTree(node: MindMapNode): MindMapNode {
  return {
    content: escapeHtml(node.content),
    payload: { ...node.payload, raw: node.content },
    children: node.children.map(escapeTree),
  }
}

function findNodeByContent(root: MindMapNode, content: string): MindMapNode | null {
  const raw = (root.payload?.raw as string | undefined) ?? root.content
  if (raw === content) return root
  for (const child of root.children) {
    const found = findNodeByContent(child, content)
    if (found) return found
  }
  return null
}
