import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import SessionTomorrow from '~/components/review/SessionTomorrow.vue'
import type { TomorrowForecast } from '~/types'

function forecast(overrides: Partial<TomorrowForecast> = {}, streak: Partial<TomorrowForecast['streak']> = {}, reminder: Partial<TomorrowForecast['reminder']> = {}): TomorrowForecast {
  return {
    date: '2026-09-30',
    due_count: 23,
    review_count: 18,
    new_count: 5,
    estimated_minutes: 6,
    ...overrides,
    streak: { current: 5, reviewed_today: true, at_risk: false, next_milestone: 7, ...streak },
    reminder: { enabled: true, hour: 19, suppressed: false, ...reminder },
  }
}

describe('SessionTomorrow', () => {
  it('mostra skeleton de altura fixa enquanto carrega', async () => {
    const w = await mountSuspended(SessionTomorrow, { props: { forecast: null, loading: true } })
    expect(w.findAll('.skeleton')).toHaveLength(2)
    expect(w.text()).toBe('')
  })

  it('renderiza carga de amanhã, dias seguidos e barra até a meta', async () => {
    const w = await mountSuspended(SessionTomorrow, { props: { forecast: forecast(), loading: false } })
    expect(w.get('[data-testid="tomorrow-load"]').text()).toContain('Amanhã: 23 cards · ≈6 min')
    expect(w.text()).toContain('5 dias seguidos')
    expect(w.text()).toContain('Faltam 2 para 7 dias')
    const bar = w.get('[role="progressbar"]')
    expect(bar.attributes('aria-valuenow')).toBe('5')
    expect(bar.attributes('aria-valuemax')).toBe('7')
  })

  it('usa singular para 1 card e texto de nada pendente para 0', async () => {
    const one = await mountSuspended(SessionTomorrow, { props: { forecast: forecast({ due_count: 1, estimated_minutes: 1 }), loading: false } })
    expect(one.text()).toContain('Amanhã: 1 card · ≈1 min')

    const zero = await mountSuspended(SessionTomorrow, { props: { forecast: forecast({ due_count: 0 }), loading: false } })
    expect(zero.text()).toContain('Amanhã: nada pendente. Aproveite para criar cards novos.')
  })

  it('primeiro dia tem texto próprio e sem barra', async () => {
    const w = await mountSuspended(SessionTomorrow, { props: { forecast: forecast({}, { current: 1, next_milestone: 3 }), loading: false } })
    expect(w.text()).toContain('1º dia. Volte amanhã para começar uma sequência.')
    expect(w.find('[role="progressbar"]').exists()).toBe(false)
  })

  it('oculta o CTA quando o lembrete já está ligado ou o e-mail está suprimido', async () => {
    const on = await mountSuspended(SessionTomorrow, { props: { forecast: forecast(), loading: false } })
    expect(on.find('[data-testid="tomorrow-reminder-cta"]').exists()).toBe(false)

    const suppressed = await mountSuspended(SessionTomorrow, { props: { forecast: forecast({}, {}, { enabled: false, suppressed: true }), loading: false } })
    expect(suppressed.find('[data-testid="tomorrow-reminder-cta"]').exists()).toBe(false)
  })

  it('emite enable-reminder pelo CTA', async () => {
    const w = await mountSuspended(SessionTomorrow, { props: { forecast: forecast({}, {}, { enabled: false }), loading: false } })
    const cta = w.get('[data-testid="tomorrow-reminder-cta"]')
    expect(cta.text()).toContain('Quer um lembrete amanhã às 19h?')
    await cta.get('button').trigger('click')
    expect(w.emitted('enable-reminder')).toHaveLength(1)
  })
})
