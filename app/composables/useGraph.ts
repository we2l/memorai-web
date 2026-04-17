import * as d3 from 'd3'
import type { GraphNode, GraphEdge } from '~/types'

interface D3Node extends d3.SimulationNodeDatum {
  id: string
  name: string
  parent_id: string | null
  notes_count: number
  flashcards_count: number
  review_count: number
  progress: number
}

interface D3Link extends d3.SimulationLinkDatum<D3Node> {
  id?: string
  type: 'hierarchy' | 'connection'
  label?: string | null
}

function nodeRadius(d: D3Node): number {
  return Math.min(60, Math.max(20, (d.flashcards_count + d.notes_count) * 4))
}

function nodeColor(d: D3Node): string {
  if (d.flashcards_count === 0) return '#6B7280' // gray
  if (d.progress < 0.3) return '#EF4444' // red
  if (d.progress < 0.7) return '#F59E0B' // amber
  return '#22C55E' // green
}

function hasWeakConnection(nodeId: string, d3Nodes: D3Node[], d3Links: D3Link[]): boolean {
  const connections = d3Links.filter(
    l => l.type === 'connection' && (
      (typeof l.source === 'string' ? l.source : (l.source as D3Node).id) === nodeId ||
      (typeof l.target === 'string' ? l.target : (l.target as D3Node).id) === nodeId
    ),
  )
  if (!connections.length) return false
  const nodeMap = new Map(d3Nodes.map(n => [n.id, n]))
  return connections.some(c => {
    const srcId = typeof c.source === 'string' ? c.source : (c.source as D3Node).id
    const tgtId = typeof c.target === 'string' ? c.target : (c.target as D3Node).id
    const otherId = srcId === nodeId ? tgtId : srcId
    const other = nodeMap.get(otherId)
    return other && other.flashcards_count > 0 && other.progress < 0.3
  })
}

export function useGraph(
  containerRef: Ref<HTMLElement | null>,
  nodes: Ref<GraphNode[]>,
  edges: Ref<GraphEdge[]>,
  options: {
    onNodeClick?: (id: string) => void
    onNodeRightClick?: (id: string, event: MouseEvent) => void
  } = {},
) {
  let simulation: d3.Simulation<D3Node, D3Link> | null = null
  let svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null = null

  function render() {
    const container = containerRef.value
    if (!container || !nodes.value.length) return

    // Cleanup
    d3.select(container).selectAll('svg').remove()
    simulation?.stop()

    const width = container.clientWidth
    const height = container.clientHeight

    const d3Nodes: D3Node[] = nodes.value.map(n => ({ ...n }))
    const d3Links: D3Link[] = edges.value.map(e => ({
      source: e.source,
      target: e.target,
      type: e.type,
      id: e.id,
      label: e.label,
    }))

    svg = d3.select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height)

    // Zoom
    const g = svg.append('g')
    svg.call(
      d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.2, 4])
        .on('zoom', (event) => {
          g.attr('transform', event.transform)
        }),
    )

    // Simulation
    simulation = d3.forceSimulation(d3Nodes)
      .force('link', d3.forceLink<D3Node, D3Link>(d3Links).id(d => d.id).distance(120))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide<D3Node>().radius(d => nodeRadius(d) + 8))

    // Edges
    const link = g.append('g')
      .selectAll('line')
      .data(d3Links)
      .join('line')
      .attr('stroke', d => d.type === 'connection' ? 'var(--color-accent-primary)' : 'var(--border-default)')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', d => d.type === 'connection' ? '6,3' : 'none')
      .attr('opacity', 0.6)

    // Node groups
    const node = g.append('g')
      .selectAll<SVGGElement, D3Node>('g')
      .data(d3Nodes)
      .join('g')
      .attr('cursor', 'pointer')

    // Drag — only activates on actual movement
    node.call(
      d3.drag<SVGGElement, D3Node>()
        .clickDistance(4)
        .on('start', (event, d) => {
          if (!event.active) simulation!.alphaTarget(0.3).restart()
          d.fx = d.x
          d.fy = d.y
        })
        .on('drag', (event, d) => {
          d.fx = event.x
          d.fy = event.y
        })
        .on('end', (event, d) => {
          if (!event.active) simulation!.alphaTarget(0)
          d.fx = null
          d.fy = null
        }),
    )

    // Circles
    node.append('circle')
      .attr('r', d => nodeRadius(d))
      .attr('fill', d => nodeColor(d))
      .attr('opacity', 0.85)
      .attr('stroke', d => hasWeakConnection(d.id, d3Nodes, d3Links) ? '#EF4444' : 'var(--bg-primary)')
      .attr('stroke-width', d => hasWeakConnection(d.id, d3Nodes, d3Links) ? 3 : 2)
      .attr('stroke-dasharray', d => hasWeakConnection(d.id, d3Nodes, d3Links) ? '4,2' : 'none')
      .on('click', function (event) {
        event.stopPropagation()
        const d = d3.select<SVGGElement, D3Node>((this as SVGCircleElement).parentNode as SVGGElement).datum()
        options.onNodeClick?.(d.id)
      })

    // Labels
    node.append('text')
      .text(d => d.name.length > 18 ? d.name.slice(0, 16) + '…' : d.name)
      .attr('text-anchor', 'middle')
      .attr('dy', d => nodeRadius(d) + 16)
      .attr('fill', 'var(--text-primary)')
      .attr('font-size', '12px')
      .attr('font-family', 'var(--font-sans)')
      .attr('pointer-events', 'none')

    // Tooltip
    const tooltip = d3.select(container)
      .append('div')
      .attr('class', 'absolute pointer-events-none px-3 py-2 rounded-lg text-small bg-surface-secondary text-base-primary border border-base shadow-lg opacity-0 transition-opacity z-50')

    node.on('mouseenter', (event, d) => {
      const pct = d.flashcards_count > 0 ? Math.round(d.progress * 100) : 0
      tooltip
        .html(`<strong>${d.name}</strong><br>${d.flashcards_count} cards · ${d.notes_count} notas · ${pct}% dominado`)
        .style('left', `${event.offsetX + 12}px`)
        .style('top', `${event.offsetY - 10}px`)
        .style('opacity', '1')
    })
    node.on('mouseleave', () => tooltip.style('opacity', '0'))

    // Click
    node.on('contextmenu', (event, d) => {
      event.preventDefault()
      options.onNodeRightClick?.(d.id, event)
    })

    // Tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as D3Node).x!)
        .attr('y1', d => (d.source as D3Node).y!)
        .attr('x2', d => (d.target as D3Node).x!)
        .attr('y2', d => (d.target as D3Node).y!)

      node.attr('transform', d => `translate(${d.x},${d.y})`)
    })
  }

  function destroy() {
    simulation?.stop()
    simulation = null
    if (containerRef.value) {
      d3.select(containerRef.value).selectAll('svg').remove()
      d3.select(containerRef.value).selectAll('div.absolute').remove()
    }
  }

  return { render, destroy }
}
