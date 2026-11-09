import { afterEach, describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { Flame } from 'lucide-vue-next'
import Arc from '~/components/ui/Arc.vue'
import IconTile from '~/components/ui/IconTile.vue'
import MetricTile from '~/components/ui/MetricTile.vue'
import NumberView from '~/components/ui/Number.vue'
import Ring from '~/components/ui/Ring.vue'
import Segmented from '~/components/ui/Segmented.vue'
import WeekStrip from '~/components/ui/WeekStrip.vue'
import { axeViolations } from './axe'

// Base components of the E2 skin (prd-visual-e2 RF-1.3, tasks 5.8)
enableAutoUnmount(afterEach)
afterEach(() => { document.body.innerHTML = '' })

describe('UiRing', () => {
  it('preenche a fração do valor (0..1, cortado nas pontas) e só desenha com animate', async () => {
    const w = await mountSuspended(Ring, { props: { value: 0.5, size: 64, stroke: 7 } })
    const prog = w.get('[data-part=prog]')
    const len = 2 * Math.PI * 28.5
    expect(Number(prog.attributes('stroke-dasharray'))).toBeCloseTo(len, 3)
    expect(Number(prog.attributes('stroke-dashoffset'))).toBeCloseTo(len / 2, 3)
    expect(prog.attributes('data-draw')).toBeUndefined()
    await w.setProps({ value: 3, animate: true })
    expect(Number(w.get('[data-part=prog]').attributes('stroke-dashoffset'))).toBeCloseTo(0, 5)
    expect(w.get('[data-part=prog]').attributes('data-draw')).toBe('true')
    await w.setProps({ value: 0 })
    expect(w.find('[data-part=prog]').exists()).toBe(false)
  })
})

describe('UiArc', () => {
  it('desenha got de of no semicírculo e mostra o número no slot', async () => {
    const w = await mountSuspended(Arc, { props: { got: 18, of: 20 }, slots: { default: () => '18 de 20' } })
    const prog = w.get('[data-part=prog]')
    const len = Math.PI * 112
    expect(Number(prog.attributes('stroke-dashoffset'))).toBeCloseTo(len * 0.1, 3)
    expect(w.text()).toContain('18 de 20')
    await w.setProps({ got: 0 })
    expect(w.find('[data-part=prog]').exists()).toBe(false)
    await w.setProps({ got: 5, of: 0 })
    expect(w.find('[data-part=prog]').exists()).toBe(false)
  })
})

describe('UiSegmented', () => {
  const options = [{ value: 3, label: '3 dias' }, { value: 7, label: '7 dias' }, { value: 14, label: '14 dias' }]

  it('é um radiogroup com uma parada de Tab e o selecionado elevado', async () => {
    const w = await mountSuspended(Segmented, { props: { modelValue: 7, options, label: 'Recuperar em' }, attachTo: document.body })
    expect(w.get('[role=radiogroup]').attributes('aria-label')).toBe('Recuperar em')
    const radios = w.findAll('[role=radio]')
    expect(radios.map(r => r.attributes('tabindex'))).toEqual(['-1', '0', '-1'])
    expect(radios[1]!.attributes('aria-checked')).toBe('true')
    expect(radios[1]!.classes()).toContain('shadow-1')
    expect(await axeViolations(w.element)).toEqual([])
  })

  it('setas andam e escolhem, com volta; Home e End vão às pontas; clique escolhe', async () => {
    const w = await mountSuspended(Segmented, { props: { modelValue: 7, options, label: 'Recuperar em' } })
    const group = w.get('[role=radiogroup]')
    await group.trigger('keydown', { key: 'ArrowRight' })
    await group.trigger('keydown', { key: 'ArrowLeft' })
    await w.setProps({ modelValue: 14 })
    await group.trigger('keydown', { key: 'ArrowRight' })
    await group.trigger('keydown', { key: 'Home' })
    await group.trigger('keydown', { key: 'End' })
    await w.findAll('[role=radio]')[0]!.trigger('click')
    expect(w.emitted('update:modelValue')!.map(e => e[0])).toEqual([14, 3, 3, 3, 3])
  })

  it('sem seleção, a primeira opção recebe o Tab', async () => {
    const w = await mountSuspended(Segmented, { props: { modelValue: null, options, label: 'x' } })
    expect(w.findAll('[role=radio]').map(r => r.attributes('tabindex'))).toEqual(['0', '-1', '-1'])
  })
})

describe('UiWeekStrip', () => {
  it('cada dia diz o nome e o estado ao leitor de tela; a letra fica só visual', async () => {
    const days = [
      { short: 'S', name: 'Segunda', state: 'done' as const },
      { short: 'T', name: 'Terça', state: 'rest' as const },
      { short: 'Q', name: 'Quarta', state: 'today' as const },
      { short: 'Q', name: 'Quinta', state: 'missed' as const },
    ]
    const w = await mountSuspended(WeekStrip, { props: { days }, attachTo: document.body })
    expect(w.findAll('li').map(li => li.attributes('aria-label'))).toEqual([
      'Segunda: estudou', 'Terça: folga da sequência', 'Quarta: hoje', 'Quinta: sem estudo',
    ])
    expect(await axeViolations(w.element)).toEqual([])
  })
})

describe('UiNumber, UiIconTile e UiMetricTile', () => {
  it('número com unidade vira um rótulo só ("18 de 20"), em fg-strong', async () => {
    const w = await mountSuspended(NumberView, { props: { value: 18, unit: 'de 20', size: 'xl' } })
    expect(w.attributes('aria-label')).toBe('18 de 20')
    expect(w.classes()).toEqual(expect.arrayContaining(['num-xl', 'text-fg-strong']))
  })

  it('o ícone de métrica é decorativo sem label e imagem com label', async () => {
    const plain = await mountSuspended(IconTile, { props: { icon: Flame, tone: 'streak' } })
    expect(plain.attributes('aria-hidden')).toBe('true')
    expect(plain.classes()).toContain('bg-metric-streak-bg')
    const named = await mountSuspended(IconTile, { props: { icon: Flame, tone: 'streak', label: 'Sequência' } })
    expect(named.attributes('role')).toBe('img')
  })

  it('a métrica tem o rótulo escrito (a cor só identifica)', async () => {
    const w = await mountSuspended(MetricTile, { props: { icon: Flame, tone: 'streak', value: 14, unit: 'dias', label: 'Sequência' } })
    expect(w.text()).toContain('Sequência')
    expect(w.find('[aria-label="14 dias"]').exists()).toBe(true)
  })
})
