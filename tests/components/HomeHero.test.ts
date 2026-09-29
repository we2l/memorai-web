import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import HomeHero from '~/components/home/HomeHero.vue'

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
})
