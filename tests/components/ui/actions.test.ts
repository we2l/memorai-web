import { afterEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import { CircleHelp, X } from 'lucide-vue-next'
import Button from '~/components/ui/Button.vue'
import IconButton from '~/components/ui/IconButton.vue'
import Link from '~/components/ui/Link.vue'
import Tabs from '~/components/ui/Tabs.vue'
import { axeViolations } from './axe'

enableAutoUnmount(afterEach)
afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

const label = (text: string) => ({ default: () => text })

describe('UiButton', () => {
  it('padrão: <button type="button"> secundário, 44 px, sem aviso de a11y', async () => {
    const w = await mountSuspended(Button, { slots: label('Salvar'), attachTo: document.body })
    const el = w.get('button')
    expect(el.attributes('type')).toBe('button')
    expect(el.classes()).toEqual(expect.arrayContaining(['bg-raised', 'border-line-strong', 'min-h-touch']))
    expect(await axeViolations(w.element)).toEqual([])
  })

  it.each([
    ['primary', ['bg-action', 'text-on-action', 'shadow-press', 'hover:bg-action-hover']],
    ['secondary', ['bg-raised', 'text-fg-strong', 'hover:bg-subtle']],
    ['ghost', ['text-fg-strong', 'hover:bg-subtle']],
    ['danger', ['bg-danger-subtle', 'text-danger']],
  ] as const)('variante %s usa os tokens dela', async (variant, classes) => {
    const w = await mountSuspended(Button, { props: { variant }, slots: label('Ok') })
    expect(w.classes()).toEqual(expect.arrayContaining([...classes]))
  })

  it('sm tem 36 px visíveis e área de toque estendida a 44 px', async () => {
    const w = await mountSuspended(Button, { props: { size: 'sm' }, slots: label('Ok') })
    expect(w.classes()).toEqual(expect.arrayContaining(['min-h-9', 'text-meta', 'before:-inset-1', 'relative']))
  })

  it('emite click; loading e disabled bloqueiam', async () => {
    const w = await mountSuspended(Button, { slots: label('Ok') })
    await w.trigger('click')
    expect(w.emitted('click')).toHaveLength(1)

    await w.setProps({ loading: true })
    await w.trigger('click')
    expect(w.emitted('click')).toHaveLength(1)
    expect(w.attributes('aria-busy')).toBe('true')
    expect(w.attributes('aria-disabled')).toBe('true')
    // Loading keeps the focus: no native disabled
    expect(w.attributes('disabled')).toBeUndefined()
    expect(w.find('svg.animate-spin').exists()).toBe(true)

    await w.setProps({ loading: false, disabled: true })
    expect(w.attributes('disabled')).toBeDefined()
    expect(w.attributes('aria-disabled')).toBeUndefined()
  })

  it('primário desabilitado troca para cinza legível, sem volume', async () => {
    const w = await mountSuspended(Button, { props: { variant: 'primary', disabled: true }, slots: label('Ok') })
    expect(w.classes()).toEqual(expect.arrayContaining(['bg-line-strong', 'text-fg-muted', 'cursor-not-allowed']))
    expect(w.classes()).not.toContain('shadow-press')
  })

  it('to vira link; desabilitado perde o href e fica aria-disabled', async () => {
    const w = await mountSuspended(Button, { props: { to: '/hoje', variant: 'primary' }, slots: label('Ir') })
    expect(w.element.tagName).toBe('A')
    expect(w.attributes('href')).toBe('/hoje')

    await w.setProps({ disabled: true })
    expect(w.element.tagName).toBe('A')
    expect(w.attributes('href')).toBeUndefined()
    expect(w.attributes('aria-disabled')).toBe('true')
  })

  it('href vira <a>', async () => {
    const w = await mountSuspended(Button, { props: { href: 'https://baigi.com.br' }, slots: label('Site') })
    expect(w.element.tagName).toBe('A')
    expect(w.attributes('href')).toBe('https://baigi.com.br')
  })

  it('iconTone colore só o ícone e é ignorado no primário', async () => {
    const w = await mountSuspended(Button, { props: { iconLeft: CircleHelp, iconTone: 'quiz' }, slots: label('20 questões') })
    const icon = w.get('svg')
    expect(icon.classes()).toContain('text-quiz')
    expect(icon.attributes('aria-hidden')).toBe('true')
    expect(w.classes()).not.toContain('text-quiz')

    await w.setProps({ variant: 'primary' })
    expect(w.get('svg').classes()).not.toContain('text-quiz')
  })

  it('avisa em dev quando há mais de um primário na mesma tela, mas não entre escopos', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const Host = defineComponent({
      props: { scoped: Boolean },
      setup(props) {
        return () => h('div', [
          h(Button, { variant: 'primary' }, () => 'A'),
          props.scoped
            ? h('div', { 'data-ds-scope': '' }, [h(Button, { variant: 'primary' }, () => 'B')])
            : h(Button, { variant: 'primary' }, () => 'B'),
        ])
      },
    })
    const scoped = await mountSuspended(Host, { props: { scoped: true }, attachTo: document.body })
    expect(warn).not.toHaveBeenCalled()
    scoped.unmount()

    const same = await mountSuspended(Host, { props: { scoped: false }, attachTo: document.body })
    await nextTick()
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('2 × variant="primary"'))
    same.unmount()
  })
})

describe('UiIconButton', () => {
  it('label vira aria-label; ícone decorativo; 44 px', async () => {
    const w = await mountSuspended(IconButton, { props: { icon: X, label: 'Fechar' }, attachTo: document.body })
    expect(w.attributes('aria-label')).toBe('Fechar')
    expect(w.get('svg').attributes('aria-hidden')).toBe('true')
    expect(w.classes()).toContain('size-touch')
    expect(await axeViolations(w.element)).toEqual([])
  })

  it('pressed vira aria-pressed; disabled não emite', async () => {
    const w = await mountSuspended(IconButton, { props: { icon: X, label: 'Favorito', pressed: false } })
    expect(w.attributes('aria-pressed')).toBe('false')
    await w.setProps({ pressed: true })
    expect(w.attributes('aria-pressed')).toBe('true')
    await w.trigger('click')
    expect(w.emitted('click')).toHaveLength(1)
    await w.setProps({ disabled: true })
    await w.trigger('click')
    expect(w.emitted('click')).toHaveLength(1)
  })

  it('sm estende a área de toque', async () => {
    const w = await mountSuspended(IconButton, { props: { icon: X, label: 'Fechar', size: 'sm' } })
    expect(w.classes()).toEqual(expect.arrayContaining(['size-9', 'before:-inset-1']))
  })
})

describe('UiLink', () => {
  it('ação por padrão; muted', async () => {
    const w = await mountSuspended(Link, { props: { to: '/cadernos' }, slots: label('Cadernos') })
    expect(w.attributes('href')).toBe('/cadernos')
    expect(w.classes()).toContain('text-action-fg')
    await w.setProps({ variant: 'muted' })
    expect(w.classes()).toContain('text-fg-muted')
  })

  it('external abre em nova aba com rel seguro e aviso para leitor de tela', async () => {
    const w = await mountSuspended(Link, { props: { href: 'https://exemplo.com', external: true }, slots: label('Exemplo'), attachTo: document.body })
    expect(w.attributes('target')).toBe('_blank')
    expect(w.attributes('rel')).toBe('noopener noreferrer')
    expect(w.get('.sr-only').text()).toBe('(abre em nova aba)')
    expect(await axeViolations(w.element)).toEqual([])
  })

  it('standalone tem alvo de 44 px', async () => {
    const w = await mountSuspended(Link, { props: { to: '/x', standalone: true }, slots: label('Ver') })
    expect(w.classes()).toContain('min-h-touch')
  })
})

describe('UiTabs', () => {
  const tabs = [{ key: 'a', label: 'Material', count: 3 }, { key: 'b', label: 'Cards' }, { key: 'c', label: 'Mapa' }]

  it('tablist rotulado, aba selecionada com tabindex 0 e painel ligado', async () => {
    const w = await mountSuspended(Tabs, {
      props: { modelValue: 'b', tabs, label: 'Seções' },
      slots: { default: ({ active }: { active: string }) => `painel ${active}` },
      attachTo: document.body,
    })
    expect(w.get('[role="tablist"]').attributes('aria-label')).toBe('Seções')
    const buttons = w.findAll('[role="tab"]')
    expect(buttons.map(b => b.attributes('aria-selected'))).toEqual(['false', 'true', 'false'])
    expect(buttons.map(b => b.attributes('tabindex'))).toEqual(['-1', '0', '-1'])
    const panel = w.get('[role="tabpanel"]')
    expect(panel.attributes('aria-labelledby')).toBe(buttons[1]!.attributes('id'))
    expect(buttons[1]!.attributes('aria-controls')).toBe(panel.attributes('id'))
    expect(panel.text()).toBe('painel b')
    expect(buttons[0]!.text()).toContain('3')
    expect(await axeViolations(w.element)).toEqual([])
  })

  it('setas, Home e End trocam a aba (com volta) e o clique seleciona', async () => {
    const w = await mountSuspended(Tabs, { props: { modelValue: 'a', tabs, label: 'Seções' } })
    const list = w.get('[role="tablist"]')
    await list.trigger('keydown', { key: 'ArrowLeft' })
    await list.trigger('keydown', { key: 'ArrowRight' })
    await list.trigger('keydown', { key: 'End' })
    await list.trigger('keydown', { key: 'Home' })
    await w.findAll('[role="tab"]')[1]!.trigger('click')
    expect(w.emitted('update:modelValue')!.map(e => e[0])).toEqual(['c', 'b', 'c', 'a', 'b'])
  })

  it('storageKey lembra a aba', async () => {
    // Node ships an inert localStorage global: the test owns an in-memory one
    const store = new Map<string, string>()
    vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v) })
    const w = await mountSuspended(Tabs, { props: { modelValue: 'a', tabs, label: 'Seções', storageKey: 'ds-tabs-test' } })
    await w.findAll('[role="tab"]')[2]!.trigger('click')
    expect(localStorage.getItem('ds-tabs-test')).toBe('c')
  })
})
