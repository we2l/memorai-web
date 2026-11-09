import { afterEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { h, nextTick } from 'vue'
import Toast from '~/components/ui/Toast.vue'
import ToastHost from '~/components/shell/ToastHost.vue'
import EmptyState from '~/components/ui/EmptyState.vue'
import ErrorState from '~/components/ui/ErrorState.vue'
import Skeleton from '~/components/ui/Skeleton.vue'
import Celebration from '~/components/ui/Celebration.vue'
import { useToast } from '~/composables/useToast'
import { axeViolations } from './axe'

enableAutoUnmount(afterEach)
afterEach(() => {
  document.body.innerHTML = ''
  const t = useToast()
  for (const i of [...t.state.items]) t.dismiss(i.id)
})

describe('UiToast', () => {
  it.each([
    ['success', 'text-success', 'Sucesso'],
    ['error', 'text-danger', 'Erro'],
    ['warning', 'text-warning', 'Atenção'],
    ['info', 'text-info', 'Aviso'],
  ] as const)('%s: superfície neutra, estado só no ícone e nomeado', async (tone, color, name) => {
    const w = await mountSuspended(Toast, { props: { message: 'Cards gerados', tone } })
    expect(w.classes()).toEqual(expect.arrayContaining(['bg-float', 'shadow-float']))
    expect(w.get('svg').classes()).toContain(color)
    expect(w.get('.sr-only').text()).toBe(`${name}:`)
  })

  it('ação, fechar e pausa só quando há ação', async () => {
    const w = await mountSuspended(Toast, { props: { message: 'Card excluído', action: { label: 'Desfazer' } }, attachTo: document.body })
    await w.get('button').trigger('click')
    await w.get('[aria-label="Fechar aviso"]').trigger('click')
    await w.trigger('mouseenter')
    await w.trigger('mouseleave')
    expect(Object.keys(w.emitted())).toEqual(expect.arrayContaining(['action', 'dismiss', 'pause', 'resume']))
    expect(await axeViolations(w.element)).toEqual([])
    const plain = await mountSuspended(Toast, { props: { message: 'Salvo' } })
    await plain.trigger('mouseenter')
    expect(plain.emitted('pause')).toBeUndefined()
  })
})

describe('ShellToastHost', () => {
  it('educado para sucesso/info e assertivo para erro/aviso, em z-toast acima da navegação', async () => {
    await mountSuspended(ToastHost, { attachTo: document.body })
    const toast = useToast()
    toast.show('Cards gerados', 'success')
    toast.show('Não foi possível salvar', 'error')
    await nextTick()
    const stack = document.querySelector('.z-toast') as HTMLElement
    expect(stack.classList.contains('bottom-toast')).toBe(true)
    expect(document.querySelector('[role="status"]')!.textContent).toContain('Cards gerados')
    expect(document.querySelector('[role="alert"]')!.textContent).toContain('Não foi possível salvar')
  })

  it('ação roda e fecha; fechar remove', async () => {
    await mountSuspended(ToastHost, { attachTo: document.body })
    const toast = useToast()
    const onClick = vi.fn()
    toast.show('Card excluído', 'info', { action: { label: 'Desfazer', onClick } })
    await nextTick()
    ;([...document.querySelectorAll('button')].find(b => b.textContent?.trim() === 'Desfazer') as HTMLButtonElement).click()
    expect(onClick).toHaveBeenCalledOnce()
    toast.show('Salvo', 'success')
    await nextTick()
    ;(document.querySelector('[aria-label="Fechar aviso"]') as HTMLButtonElement).click()
    expect(toast.state.items).toHaveLength(0)
  })
})

describe('UiEmptyState', () => {
  it('título, frase, um CTA e mascote opcional', async () => {
    const w = await mountSuspended(EmptyState, {
      props: { title: 'Nenhum podcast ainda', description: 'Gere um a partir dos seus pontos fracos.', mascot: true },
      slots: { action: () => h('button', { type: 'button' }, 'Gerar podcast') },
      attachTo: document.body,
    })
    expect(w.get('h2').text()).toBe('Nenhum podcast ainda')
    expect(w.text()).toContain('Gerar podcast')
    expect(w.find('.baigi-mascot').exists()).toBe(true)
    expect(await axeViolations(w.element)).toEqual([])
    const bare = await mountSuspended(EmptyState, { props: { title: 'Vazio', level: 3 } })
    expect(bare.find('.baigi-mascot').exists()).toBe(false)
    expect(bare.find('h3').exists()).toBe(true)
  })
})

describe('UiErrorState', () => {
  it('alerta com tentar de novo sobre UiButton; variantes', async () => {
    const w = await mountSuspended(ErrorState, { props: { description: 'Confira a conexão.' }, slots: { actions: () => h('a', { href: '/hoje' }, 'Voltar') }, attachTo: document.body })
    expect(w.attributes('role')).toBe('alert')
    expect(w.text()).toContain('Não foi possível carregar')
    expect(w.classes()).toEqual(expect.arrayContaining(['bg-raised', 'shadow-1']))
    const retry = w.get('button')
    expect(retry.text()).toBe('Tentar de novo')
    expect(retry.classes()).toContain('min-h-touch')
    await retry.trigger('click')
    expect(w.emitted('retry')).toHaveLength(1)
    expect(await axeViolations(w.element)).toEqual([])
    await w.setProps({ variant: 'page' })
    expect(w.classes()).not.toContain('bg-raised')
  })
})

describe('UiSkeleton', () => {
  it('decorativo, achado por data-testid; texto, linha e bloco', async () => {
    const text = await mountSuspended(Skeleton, { props: { lines: 3 } })
    expect(text.attributes()).toMatchObject({ 'data-testid': 'skeleton', 'aria-hidden': 'true' })
    expect(text.findAll('.animate-pulse')).toHaveLength(3)
    expect(text.findAll('.animate-pulse').at(-1)!.classes()).toContain('w-2/3')
    const row = await mountSuspended(Skeleton, { props: { variant: 'row' } })
    expect(row.findAll('.animate-pulse')).toHaveLength(3)
    const block = await mountSuspended(Skeleton, { props: { variant: 'block', size: 'lg' } })
    expect(block.get('.animate-pulse').classes()).toEqual(expect.arrayContaining(['h-40', 'rounded-card', 'bg-soft']))
  })
})

describe('UiCelebration', () => {
  it('anuncia o título, escreve o tipo no -fg e mostra os números', async () => {
    const w = await mountSuspended(Celebration, {
      props: { kind: 'streak', title: '6 dias seguidos!', stats: [{ value: 20, label: 'cards' }, { value: '86%', label: 'de acerto' }] },
      slots: { default: () => h('button', { type: 'button' }, 'Próximo lote') },
      attachTo: document.body,
    })
    expect(w.attributes('role')).toBe('status')
    expect(w.text()).toContain('6 dias seguidos!')
    expect(w.text()).toContain('Sequência mantida')
    expect(w.findAll('p').find(p => p.text() === 'Sequência mantida')!.classes()).toContain('text-streak-fg')
    expect(w.text()).toContain('86%')
    expect(w.text()).toContain('Próximo lote')
    expect(await axeViolations(w.element)).toEqual([])
  })

  it('animação em até 700 ms (token) e partículas determinísticas', async () => {
    const w = await mountSuspended(Celebration, { props: { kind: 'milestone', title: '1.000 cards' } })
    expect(w.find('.motion-safe\\:animate-celebrate-pop').exists()).toBe(true)
    const dots = w.findAll('.animate-celebrate-burst')
    expect(dots).toHaveLength(12)
    expect(dots[0]!.attributes('style')).toContain('--burst-x: 80px')
  })

  it('prefers-reduced-motion: sem partículas', async () => {
    const original = window.matchMedia
    window.matchMedia = ((q: string) => ({ matches: q.includes('reduce'), media: q, addEventListener: () => {}, removeEventListener: () => {} })) as unknown as typeof window.matchMedia
    try {
      const w = await mountSuspended(Celebration, { props: { kind: 'goal', title: 'Meta cumprida', mascot: false } })
      await nextTick()
      expect(w.findAll('.animate-celebrate-burst')).toHaveLength(0)
      expect(w.text()).toContain('Meta de hoje cumprida')
    } finally {
      window.matchMedia = original
    }
  })
})
