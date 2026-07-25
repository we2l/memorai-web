<template>
  <div class="relative w-full h-[380px] sm:h-[440px] rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
    <!-- Graph container -->
    <div ref="containerRef" class="w-full h-full" />

    <!-- Overlay controls (zoom hint) -->
    <div class="absolute bottom-3 left-3 flex items-center gap-2">
      <button class="w-8 h-8 rounded-lg bg-white/90 border border-gray-200 shadow-sm flex items-center justify-center text-gray-500 hover:text-[#6F3FF5] transition-colors" @click="zoomIn" aria-label="Zoom in">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
      </button>
      <button class="w-8 h-8 rounded-lg bg-white/90 border border-gray-200 shadow-sm flex items-center justify-center text-gray-500 hover:text-[#6F3FF5] transition-colors" @click="zoomOut" aria-label="Zoom out">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M20 12H4" /></svg>
      </button>
      <span class="text-[10px] text-gray-400 ml-1">Scroll ou arraste</span>
    </div>

    <!-- Legend -->
    <div class="absolute top-3 right-3 flex items-center gap-3 bg-white/90 backdrop-blur-sm border border-gray-100 rounded-lg px-3 py-1.5">
      <span class="flex items-center gap-1 text-[10px] text-gray-500">
        <span class="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Dominado
      </span>
      <span class="flex items-center gap-1 text-[10px] text-gray-500">
        <span class="w-2.5 h-2.5 rounded-full bg-[#6F3FF5]" /> Médio
      </span>
      <span class="flex items-center gap-1 text-[10px] text-gray-500">
        <span class="w-2.5 h-2.5 rounded-full bg-red-500" /> Fraco
      </span>
    </div>

    <!-- Node detail panel (shows on click) -->
    <Transition name="slide-up">
      <div v-if="selectedNode" class="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-lg px-5 py-4 flex items-center gap-4">
        <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" :style="{ backgroundColor: selectedNode.color + '20' }">
          <div class="w-5 h-5 rounded-full" :style="{ backgroundColor: selectedNode.color }" />
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold text-[#1E0A3C]">{{ selectedNode.name }}</p>
          <p class="text-xs text-gray-500">{{ selectedNode.cards }} cards · {{ selectedNode.notes }} notas · {{ selectedNode.pct }}% dominado</p>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <span class="text-[11px] font-medium text-[#6F3FF5] bg-[#F0EAFF] px-2.5 py-1 rounded-lg cursor-default">Revisar</span>
          <span class="text-[11px] font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg cursor-default">Mapa mental</span>
        </div>
        <button class="text-gray-400 hover:text-gray-600 shrink-0" @click="selectedNode = null" aria-label="Fechar">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import * as d3 from 'd3'

const containerRef = ref<HTMLElement | null>(null)
const selectedNode = ref<{ name: string; cards: number; notes: number; pct: number; color: string } | null>(null)

let zoomBehavior: d3.ZoomBehavior<SVGSVGElement, unknown> | null = null
let svgEl: d3.Selection<SVGSVGElement, unknown, null, undefined> | null = null

interface MockNode extends d3.SimulationNodeDatum {
  id: string
  name: string
  cards: number
  notes: number
  progress: number
  radius: number
}

interface MockLink extends d3.SimulationLinkDatum<MockNode> {
  source: string
  target: string
  type: 'hierarchy' | 'connection'
}

const mockNodes: MockNode[] = [
  { id: 'english', name: 'Inglês', cards: 48, notes: 12, progress: 0.65, radius: 36 },
  { id: 'vocab', name: 'Vocabulário', cards: 32, notes: 6, progress: 0.82, radius: 28 },
  { id: 'grammar', name: 'Gramática', cards: 28, notes: 8, progress: 0.45, radius: 26 },
  { id: 'phrasal', name: 'Phrasal Verbs', cards: 15, notes: 3, progress: 0.25, radius: 20 },
  { id: 'tenses', name: 'Tempos Verbais', cards: 20, notes: 4, progress: 0.58, radius: 22 },
  { id: 'listening', name: 'Listening', cards: 18, notes: 5, progress: 0.52, radius: 22 },
  { id: 'idioms', name: 'Expressões', cards: 10, notes: 2, progress: 0.18, radius: 18 },
  { id: 'writing', name: 'Writing', cards: 12, notes: 3, progress: 0.35, radius: 20 },
  { id: 'prepositions', name: 'Preposições', cards: 14, notes: 2, progress: 0.72, radius: 20 },
  { id: 'conditionals', name: 'Condicionais', cards: 8, notes: 2, progress: 0.3, radius: 18 },
  { id: 'reading', name: 'Reading', cards: 22, notes: 4, progress: 0.68, radius: 24 },
]

const mockLinks: MockLink[] = [
  { source: 'english', target: 'vocab', type: 'hierarchy' },
  { source: 'english', target: 'grammar', type: 'hierarchy' },
  { source: 'english', target: 'listening', type: 'hierarchy' },
  { source: 'english', target: 'writing', type: 'hierarchy' },
  { source: 'english', target: 'reading', type: 'hierarchy' },
  { source: 'grammar', target: 'phrasal', type: 'hierarchy' },
  { source: 'grammar', target: 'tenses', type: 'hierarchy' },
  { source: 'grammar', target: 'prepositions', type: 'hierarchy' },
  { source: 'grammar', target: 'conditionals', type: 'hierarchy' },
  { source: 'vocab', target: 'idioms', type: 'hierarchy' },
  // Non-hierarchical connections (dashed)
  { source: 'listening', target: 'idioms', type: 'connection' },
  { source: 'writing', target: 'tenses', type: 'connection' },
]

function getNodeColor(progress: number): string {
  if (progress >= 0.7) return '#22C55E'
  if (progress >= 0.4) return '#6F3FF5'
  return '#EF4444'
}

function zoomIn() {
  if (svgEl && zoomBehavior) {
    svgEl.transition().duration(300).call(zoomBehavior.scaleBy, 1.3)
  }
}

function zoomOut() {
  if (svgEl && zoomBehavior) {
    svgEl.transition().duration(300).call(zoomBehavior.scaleBy, 0.7)
  }
}

onMounted(() => {
  const container = containerRef.value
  if (!container) return

  const width = container.clientWidth
  const height = container.clientHeight

  const d3Nodes: MockNode[] = mockNodes.map(n => ({ ...n }))
  const d3Links: MockLink[] = mockLinks.map(l => ({ ...l }))

  svgEl = d3.select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height)

  const g = svgEl.append('g')

  // Zoom + pan
  zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.4, 2.5])
    .on('zoom', (event) => {
      g.attr('transform', event.transform)
    })

  svgEl.call(zoomBehavior)

  // Simulation
  const simulation = d3.forceSimulation(d3Nodes as d3.SimulationNodeDatum[] as MockNode[])
    .force('link', d3.forceLink<MockNode, MockLink>(d3Links).id(d => d.id).distance(90))
    .force('charge', d3.forceManyBody().strength(-250))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collide', d3.forceCollide<MockNode>().radius(d => d.radius + 10))

  // Links
  const link = g.append('g')
    .selectAll('line')
    .data(d3Links)
    .join('line')
    .attr('stroke', d => d.type === 'connection' ? '#6F3FF5' : '#E8E0F8')
    .attr('stroke-width', 1.5)
    .attr('stroke-dasharray', d => d.type === 'connection' ? '6,3' : 'none')
    .attr('opacity', 0.6)

  // Node groups
  const node = g.append('g')
    .selectAll<SVGGElement, MockNode>('g')
    .data(d3Nodes)
    .join('g')
    .attr('cursor', 'pointer')

  // Drag
  node.call(
    d3.drag<SVGGElement, MockNode>()
      .clickDistance(4)
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart()
        d.fx = d.x
        d.fy = d.y
      })
      .on('drag', (event, d) => {
        d.fx = event.x
        d.fy = event.y
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0)
        d.fx = null
        d.fy = null
      }),
  )

  // Circles
  node.append('circle')
    .attr('r', d => d.radius)
    .attr('fill', d => getNodeColor(d.progress))
    .attr('opacity', 0.85)
    .attr('stroke', '#FFFFFF')
    .attr('stroke-width', 2)

  // Labels
  node.append('text')
    .text(d => d.name)
    .attr('text-anchor', 'middle')
    .attr('dy', d => d.radius + 14)
    .attr('fill', '#1E0A3C')
    .attr('font-size', '10px')
    .attr('font-weight', '500')
    .attr('pointer-events', 'none')

  // Click to select
  node.on('click', (_event, d) => {
    selectedNode.value = {
      name: d.name,
      cards: d.cards,
      notes: d.notes,
      pct: Math.round(d.progress * 100),
      color: getNodeColor(d.progress),
    }
  })

  // Tick
  simulation.on('tick', () => {
    link
      .attr('x1', d => (d.source as MockNode).x!)
      .attr('y1', d => (d.source as MockNode).y!)
      .attr('x2', d => (d.target as MockNode).x!)
      .attr('y2', d => (d.target as MockNode).y!)

    node.attr('transform', d => `translate(${d.x},${d.y})`)
  })
})
</script>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.2s ease, opacity 0.2s ease;
}
.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
  opacity: 0;
}
</style>
