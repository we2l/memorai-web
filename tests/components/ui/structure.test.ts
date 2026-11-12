import { afterEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import Section from '~/components/ui/Section.vue'
import PageHeader from '~/components/ui/PageHeader.vue'
import ListRow from '~/components/ui/ListRow.vue'
import Stat from '~/components/ui/Stat.vue'
import ProgressBar from '~/components/ui/ProgressBar.vue'
import Tag from '~/components/ui/Tag.vue'
import SubjectMark from '~/components/ui/SubjectMark.vue'
import PracticeIcon from '~/components/ui/PracticeIcon.vue'
import { axeViolations } from './axe'

enableAutoUnmount(afterEach)
afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('UiSection', () => {
  it('raised: superfície branca com sombra, rotulada pelo título (h2)', async () => {
    const w = await mountSuspended(Section, {
      props: { title: 'Plano do dia', label: 'Hoje', description: '4 passos' },
      slots: { default: () => 'conteúdo', action: () => h('a', { href: '#' }, 'Ver tudo') },
      attachTo: document.body,
    })
    expect(w.element.tagName).toBe('SECTION')
    expect(w.classes()).toEqual(expect.arrayContaining(['bg-raised', 'shadow-1', 'rounded-card']))
    const heading = w.get('h2')
    expect(heading.text()).toBe('Plano do dia')
    expect(w.attributes('aria-labelledby')).toBe(heading.attributes('id'))
    expect(w.text()).toContain('Hoje')
    expect(w.text()).toContain('Ver tudo')
    expect(await axeViolations(w.element)).toEqual([])
  })

  it('tinted e plain; nível do título; flush sem padding', async () => {
    const w = await mountSuspended(Section, { props: { title: 'Próximo passo', variant: 'tinted', level: 3 } })
    expect(w.classes()).toEqual(expect.arrayContaining(['bg-tinted', 'rounded-hero', 'shadow-tinted']))
    expect(w.classes()).not.toContain('shadow-1')
    expect(w.find('h3').exists()).toBe(true)
    await w.setProps({ variant: 'plain' })
    expect(w.classes()).toEqual([])
    await w.setProps({ variant: 'raised', flush: true })
    expect(w.classes()).not.toContain('p-5')
  })

  it('sem título não tem aria-labelledby nem cabeçalho', async () => {
    const w = await mountSuspended(Section, { slots: { default: () => 'x' } })
    expect(w.attributes('aria-labelledby')).toBeUndefined()
    expect(w.find('h2').exists()).toBe(false)
  })

  it('avisa em dev com mais de um bloco tingido na tela', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const Host = defineComponent({ render: () => h('div', [h(Section, { variant: 'tinted', title: 'A' }), h(Section, { variant: 'tinted', title: 'B' })]) })
    await mountSuspended(Host, { attachTo: document.body })
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('2 × UiSection variant="tinted"'))
  })
})

describe('UiPageHeader', () => {
  it('h1 único, voltar, meta e ações', async () => {
    const w = await mountSuspended(PageHeader, {
      props: { title: 'TRF 4ª Região', meta: 'Prova em 45 dias', back: { to: '/cadernos', label: 'Cadernos' } },
      slots: { actions: () => h('button', { type: 'button' }, 'Revisar hoje') },
      attachTo: document.body,
    })
    expect(w.findAll('h1')).toHaveLength(1)
    expect(w.get('h1').classes()).toEqual(expect.arrayContaining(['text-page-title']))
    const back = w.get('a')
    expect(back.attributes('href')).toBe('/cadernos')
    expect(back.text()).toBe('Cadernos')
    expect(w.text()).toContain('Prova em 45 dias')
    expect(w.text()).toContain('Revisar hoje')
    expect(await axeViolations(w.element)).toEqual([])
  })
})

describe('UiListRow', () => {
  it('to: a linha inteira é o link, com slots e 44 px', async () => {
    const w = await mountSuspended(ListRow, {
      props: { title: 'Português', meta: '12 hoje', to: '/cadernos/1' },
      slots: { leading: () => h('span', { 'aria-hidden': 'true' }, '•'), trailing: () => '62%' },
      attachTo: document.body,
    })
    expect(w.element.tagName).toBe('A')
    expect(w.attributes('href')).toBe('/cadernos/1')
    expect(w.classes()).toEqual(expect.arrayContaining(['min-h-touch', 'hover:bg-hover']))
    expect(w.text()).toContain('Português')
    expect(w.text()).toContain('12 hoje')
    expect(w.text()).toContain('62%')
    expect(await axeViolations(w.element)).toEqual([])
  })

  it('active: tom de ação e aria-current', async () => {
    const link = await mountSuspended(ListRow, { props: { title: 'A', to: '/a', active: true } })
    expect(link.attributes('aria-current')).toBe('page')
    expect(link.classes()).toContain('bg-action-subtle')
    const div = await mountSuspended(ListRow, { props: { title: 'B', active: true } })
    expect(div.attributes('aria-current')).toBe('true')
  })

  it('as="button" vira botão com os listeners; div é estática', async () => {
    const onClick = vi.fn()
    const btn = await mountSuspended(ListRow, { props: { title: 'Abrir', as: 'button' }, attrs: { onClick } })
    expect(btn.element.tagName).toBe('BUTTON')
    expect(btn.attributes('type')).toBe('button')
    await btn.trigger('click')
    expect(onClick).toHaveBeenCalled()
    const div = await mountSuspended(ListRow, { props: { title: 'Fixa' } })
    expect(div.element.tagName).toBe('DIV')
    expect(div.classes()).not.toContain('hover:bg-hover')
  })
})

describe('UiStat', () => {
  it('número em fg-strong com unidade, rótulo e dica', async () => {
    const w = await mountSuspended(Stat, { props: { value: '41%', label: 'de domínio', hint: 'meta 70%' } })
    expect(w.text()).toContain('41%')
    expect(w.text()).toContain('de domínio')
    expect(w.text()).toContain('meta 70%')
    expect(w.get('p').classes()).toContain('text-fg-strong')
    expect(w.find('svg').exists()).toBe(false)
  })

  it('conquista: forma pequena decorativa e texto no -fg do tom', async () => {
    const w = await mountSuspended(Stat, { props: { value: 6, unit: 'dias', label: 'seguidos', tone: 'streak' } })
    const icon = w.get('svg')
    expect(icon.classes()).toContain('text-metric-streak')
    expect(icon.attributes('aria-hidden')).toBe('true')
    expect(w.findAll('p')[1]!.classes()).toContain('text-metric-streak-fg')
    const c = await mountSuspended(Stat, { props: { value: 3, label: 'lotes', tone: 'celebrate', size: 'lg' } })
    expect(c.findAll('p')[1]!.classes()).toContain('text-metric-goal-fg')
    expect(c.html()).toContain('num-l')
  })
})

describe('UiProgressBar', () => {
  it('progressbar com nome, valores e largura; limita entre 0 e max', async () => {
    const w = await mountSuspended(ProgressBar, { props: { value: 41, label: 'Domínio de Português' }, attachTo: document.body })
    const bar = w.get('[role="progressbar"]')
    expect(bar.attributes()).toMatchObject({ 'aria-label': 'Domínio de Português', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': '41', 'aria-valuetext': '41%' })
    expect(bar.classes()).toEqual(expect.arrayContaining(['h-1.25', 'bg-progress-track']))
    expect(bar.get('span').attributes('style')).toContain('width: 41%')
    expect(bar.get('span').classes()).toContain('bg-action')
    expect(await axeViolations(w.element)).toEqual([])

    await w.setProps({ value: 140 })
    expect(bar.attributes('aria-valuenow')).toBe('100')
    await w.setProps({ value: -3 })
    expect(bar.attributes('aria-valuenow')).toBe('0')
  })

  it('tons, tamanho e valor visível', async () => {
    const w = await mountSuspended(ProgressBar, { props: { value: 3, max: 4, label: 'Acerto', tone: 'neutral', size: 'md', showValue: true } })
    expect(w.get('[role="progressbar"]').classes()).toContain('h-2')
    expect(w.get('[role="progressbar"] span').classes()).toContain('bg-progress-neutral')
    expect(w.text()).toBe('75%')
    await w.setProps({ tone: 'celebrate' })
    expect(w.get('[role="progressbar"] span').classes()).toContain('bg-metric-goal')
  })

  it('segmentos: "1 de 3" e um segmento cheio', async () => {
    const w = await mountSuspended(ProgressBar, { props: { value: 1, max: 3, segments: 3, label: 'Meta de hoje' } })
    const bar = w.get('[role="progressbar"]')
    expect(bar.attributes('aria-valuetext')).toBe('1 de 3')
    const segs = [...bar.element.children]
    expect(segs).toHaveLength(3)
    expect(segs.map(s => !!s.querySelector('.bg-action'))).toEqual([true, false, false])
  })

  it('segmentos parciais: o lote em andamento enche só a sua parte (revisão v3)', async () => {
    const w = await mountSuspended(ProgressBar, { props: { value: 0.7, max: 3, segments: 3, label: 'Lote 1 de 3, 70% feito' } })
    const segs = [...w.get('[role="progressbar"]').element.children]
    expect((segs[0]!.firstElementChild as HTMLElement).style.width).toBe('70%')
    expect(segs[1]!.childElementCount).toBe(0)
  })
})

describe('UiTag', () => {
  it.each([
    ['neutral', 'bg-soft', 'text-fg-muted'],
    ['action', 'bg-action-subtle', 'text-action-fg'],
    ['success', 'bg-success-subtle', 'text-success'],
    ['warning', 'bg-warning-subtle', 'text-warning'],
    ['danger', 'bg-danger-subtle', 'text-danger'],
    ['info', 'bg-info-subtle', 'text-info'],
  ] as const)('tom %s: texto sobre o próprio fundo', async (tone, bg, fg) => {
    const w = await mountSuspended(Tag, { props: { tone }, slots: { default: () => 'selo' } })
    expect(w.classes()).toEqual(expect.arrayContaining([bg, fg, 'text-label']))
  })

  it('prática: fundo neutro com ponto colorido (cor só pequena)', async () => {
    const w = await mountSuspended(Tag, { props: { tone: 'quiz' }, slots: { default: () => 'Questões' } })
    expect(w.classes()).toEqual(expect.arrayContaining(['bg-soft', 'text-fg']))
    expect(w.get('[aria-hidden="true"]').classes()).toContain('bg-quiz')
    const l = await mountSuspended(Tag, { props: { tone: 'listen' }, slots: { default: () => 'Ouvir' } })
    expect(l.get('[aria-hidden="true"]').classes()).toContain('bg-listen')
  })
})

describe('UiSubjectMark', () => {
  it('ponto decorativo com o tom da cor do caderno', async () => {
    const w = await mountSuspended(SubjectMark, { props: { color: 'blue' } })
    expect(w.classes()).toEqual(expect.arrayContaining(['bg-subject-2', 'size-2.5', 'rounded-full']))
    expect(w.attributes('aria-hidden')).toBe('true')
    await w.setProps({ color: '#DC2626', size: 'lg' })
    expect(w.classes()).toEqual(expect.arrayContaining(['bg-subject-4', 'size-3.5']))
  })

  it('índice estável sem cor; label vira imagem nomeada', async () => {
    const w = await mountSuspended(SubjectMark, { props: { index: 10, label: 'Matéria 3' }, attachTo: document.body })
    expect(w.classes()).toContain('bg-subject-3')
    expect(w.attributes('role')).toBe('img')
    expect(w.attributes('aria-label')).toBe('Matéria 3')
    expect(await axeViolations(w.element)).toEqual([])
  })
})

describe('UiPracticeIcon', () => {
  it.each([
    ['review', 'bg-action-subtle', 'text-action-fg'],
    ['quiz', 'bg-quiz-subtle', 'text-quiz'],
    ['listen', 'bg-listen-subtle', 'text-listen'],
  ] as const)('%s: a cor do modo no ícone e no azulejo dele (E2)', async (mode, tile, tone) => {
    const w = await mountSuspended(PracticeIcon, { props: { mode } })
    expect(w.classes()).toEqual(expect.arrayContaining([tile, tone, 'size-9']))
    expect(w.attributes('aria-hidden')).toBe('true')
  })

  it('tamanhos e rótulo quando sozinho', async () => {
    const w = await mountSuspended(PracticeIcon, { props: { mode: 'quiz', size: 'lg', label: 'Questões' }, attachTo: document.body })
    expect(w.classes()).toContain('size-10')
    expect(w.attributes('role')).toBe('img')
    expect(w.attributes('aria-label')).toBe('Questões')
    expect(await axeViolations(w.element)).toEqual([])
    await w.setProps({ size: 'sm' })
    expect(w.classes()).toEqual(expect.arrayContaining(['size-7.5', 'rounded-row']))
  })
})
