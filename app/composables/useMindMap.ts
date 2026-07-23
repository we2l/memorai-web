import type { Ref } from 'vue'

export interface MindMapNode {
  content: string
  children: MindMapNode[]
  payload?: { type?: string; [key: string]: unknown }
}

const NODE_COLORS: Record<string, string> = {
  conceito: '#6F3FF5',
  definição: '#3B82F6',
  exemplo: '#22C55E',
  exceção: '#EF4444',
  referência: '#8A90A8',
}

const DEPTH_COLORS = ['#6F3FF5', '#3B82F6', '#22C55E', '#F59E0B', '#EF4444']

export function useMindMap(
  containerRef: Ref<HTMLElement | null>,
  options: {
    colorByType?: boolean
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
        if (options.colorByType) {
          const type = node.payload?.type
          if (type && NODE_COLORS[type]) return NODE_COLORS[type]
        }
        return DEPTH_COLORS[Math.min(node.state.depth, DEPTH_COLORS.length - 1)]
      },
      lineWidth: (node: any) => Math.max(1, 2.5 - node.state.depth * 0.4),
    })

    await mm.setData(data)
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

function findNodeByContent(root: MindMapNode, content: string): MindMapNode | null {
  if (root.content === content) return root
  for (const child of root.children) {
    const found = findNodeByContent(child, content)
    if (found) return found
  }
  return null
}
