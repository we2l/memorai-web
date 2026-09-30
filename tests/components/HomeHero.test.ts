import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import HomeHero from '~/components/home/HomeHero.vue'

const { apiMock } = vi.hoisted(() => ({ apiMock: vi.fn() }))

mockNuxtImport('useNuxtApp', (original) => () => new Proxy(original(), {
  get: (target, key) => (key === '$api' ? apiMock : Reflect.get(target, key)),
}))

const base = { topicProgress: [], nextExam: null, userName: 'Ana Souza' }

describe('HomeHero', () => {
  it('conta revisados + restantes (due + atrasados) no denominador', async () => {
    const wrapper = await mountSuspended(HomeHero, {
      props: {
        ...base,
        stats: { reviewed_today: 5, due_today: 10, total_cards: 40, streak: 0 } as any,
        backlog: { overdue_count: 3 } as any,
      },
    })
    expect(wrapper.text()).toContain('5 de 18 concluídos')
    expect(wrapper.findAll('.hero__segment')).toHaveLength(18)
    expect(wrapper.findAll('.hero__segment--done')).toHaveLength(5)
  })

  it('escala os segmentos quando a sessão passa de 24 cards', async () => {
    const wrapper = await mountSuspended(HomeHero, {
      props: { ...base, stats: { reviewed_today: 24, due_today: 24, total_cards: 99, streak: 0 } as any, backlog: { overdue_count: 0 } as any },
    })
    expect(wrapper.text()).toContain('24 de 48 concluídos')
    expect(wrapper.findAll('.hero__segment')).toHaveLength(24)
    expect(wrapper.findAll('.hero__segment--done')).toHaveLength(12)
  })

  describe('dias seguidos (prd-retencao-lembretes)', () => {
    beforeEach(() => apiMock.mockReset())

    it('mostra o chip a partir de 1 dia', async () => {
      const wrapper = await mountSuspended(HomeHero, {
        props: { ...base, stats: { reviewed_today: 1, due_today: 3, total_cards: 10, streak: 1 } as any, backlog: { overdue_count: 0 } as any },
      })
      expect(wrapper.get('[data-testid="hero-streak"]').text()).toBe('🔥 1 dia seguido')
    })

    it('muda o texto e o tom quando a sequência está em risco', async () => {
      const wrapper = await mountSuspended(HomeHero, {
        props: { ...base, stats: { reviewed_today: 0, due_today: 3, total_cards: 10, streak: 5, streak_at_risk: true } as any, backlog: { overdue_count: 0 } as any },
      })
      const chip = wrapper.get('[data-testid="hero-streak"]')
      expect(chip.text()).toBe('🔥 Revise hoje para manter 5 dias')
      expect(chip.classes()).toContain('hero__streak--risk')
    })

    it('em dia: hero compacto com amanhã (busca /review/tomorrow só nesse estado)', async () => {
      apiMock.mockResolvedValueOnce({ data: { due_count: 12, estimated_minutes: 3 } })
      const wrapper = await mountSuspended(HomeHero, {
        props: { ...base, stats: { reviewed_today: 8, due_today: 0, total_cards: 40, streak: 3 } as any, backlog: { overdue_count: 0 } as any },
      })
      await flushPromises()
      expect(wrapper.find('[data-testid="hero-up-to-date"]').exists()).toBe(true)
      expect(wrapper.find('.hero__synapse').exists()).toBe(false)
      expect(wrapper.text()).toContain('Tudo em dia, Ana.')
      expect(wrapper.text()).toContain('🔥 3 dias seguidos')
      expect(wrapper.get('[data-testid="hero-tomorrow"]').text()).toBe('Amanhã: 12 cards · ≈3 min')
      expect(apiMock).toHaveBeenCalledWith('/review/tomorrow')
    })

    it('com cards pendentes não busca amanhã', async () => {
      await mountSuspended(HomeHero, {
        props: { ...base, stats: { reviewed_today: 0, due_today: 3, total_cards: 10, streak: 0 } as any, backlog: { overdue_count: 0 } as any },
      })
      await flushPromises()
      expect(apiMock).not.toHaveBeenCalled()
    })

    it('sem nenhum card: nada de em dia (a checklist cuida)', async () => {
      const wrapper = await mountSuspended(HomeHero, {
        props: { ...base, stats: { reviewed_today: 0, due_today: 0, total_cards: 0, streak: 0 } as any, backlog: { overdue_count: 0 } as any },
      })
      expect(wrapper.find('[data-testid="hero-up-to-date"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="hero-streak"]').exists()).toBe(false)
    })
  })
})
