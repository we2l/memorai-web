import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import Tour from '~/components/entrada/Tour.vue'
import Home from '~/components/entrada/Home.vue'
import AreaPicker from '~/components/onboarding/AreaPicker.vue'

const { track } = vi.hoisted(() => ({ track: vi.fn() }))
mockNuxtImport('useAnalytics', () => () => ({ track, register: vi.fn(), identify: vi.fn(), reset: vi.fn() }))

describe('entrada do /comecar', () => {
  beforeEach(() => track.mockReset())

  it('o card do passo 1: mostra a resposta, Lembrei dá 2 dias e Continuar segue', async () => {
    const w = await mountSuspended(Tour, { props: { step: 0, catalog: null, failed: false, flow: false } })
    expect(w.find('[data-testid="entry-answer"]').exists()).toBe(false)
    await w.find('[data-testid="entry-flip"]').trigger('click')
    expect(w.find('[data-testid="entry-answer"]').text()).toContain('12 contribuições mensais')
    await w.find('[data-testid="entry-remembered"]').trigger('click')
    expect(w.find('[data-testid="entry-feedback"]').text()).toContain('daqui a 2 dias')
    expect(track).toHaveBeenCalledWith('entry_card_rated', { rating: 'remembered', position: 'tour' })
    expect(w.find('[data-testid="entry-card-areas"]').attributes('href')).toBe('/comecar/areas')
    await w.find('[data-testid="entry-next"]').trigger('click')
    expect(w.emitted('go')).toEqual([[1]])
  })

  it('Não lembrei: volta amanhã; a tecla 1 também avalia', async () => {
    const w = await mountSuspended(Tour, { props: { step: 0, catalog: null, failed: false, flow: false }, attachTo: document.body })
    await w.find('[data-testid="entry-flip"]').trigger('click')
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }))
    await flushPromises()
    expect(w.find('[data-testid="entry-feedback"]').text()).toContain('amanhã')
    w.unmount()
  })

  it('Pular leva aos planos e mede de onde', async () => {
    const w = await mountSuspended(Tour, { props: { step: 2, catalog: null, failed: false, flow: false } })
    await w.find('[data-testid="entry-skip"]').trigger('click')
    expect(w.emitted('go')).toEqual([[6]])
    expect(track).toHaveBeenCalledWith('entry_tour_skipped', { from: 'revisar' })
  })

  it('no último passo não tem Pular e os planos esperam o catálogo', async () => {
    const w = await mountSuspended(Tour, { props: { step: 6, catalog: null, failed: true, flow: true } })
    expect(w.find('[data-testid="entry-skip"]').exists()).toBe(false)
    expect(w.find('[data-testid="entry-plans-error"]').exists()).toBe(true)
    expect(w.find('[data-testid="entry-tour"]').attributes('data-flow')).toBe('true')
    expect(w.find('[data-testid="entry-plans-signup"]').attributes('href')).toBe('/criar-conta')
  })

  it('a entrada: cada recurso abre o seu passo; nunca "app"', async () => {
    const w = await mountSuspended(Home, { props: { catalog: null, loginTo: '/entrar' } })
    await w.find('[data-testid="entry-feature-5"]').trigger('click')
    expect(w.emitted('start')).toEqual([[4, 'feature']])
    await w.find('[data-testid="entry-start"]').trigger('click')
    expect(w.emitted('start')![1]).toEqual([0, 'hero'])
    expect(w.find('h1').text()).toContain('esquecer.')
    expect(w.text()).not.toMatch(/\bapp\b|aplicativo/i)
  })
})

describe('grade das áreas', () => {
  it('visitante: sem "Começar pelo meu material", com Entrar', async () => {
    const w = await mountSuspended(AreaPicker, { props: { loggedIn: false } })
    expect(w.findAll('[data-testid^="area-"]').filter(a => a.attributes('href')?.startsWith('/comecar/'))).toHaveLength(6)
    expect(w.find('[data-testid="area-skip"]').exists()).toBe(false)
    expect(w.text()).toContain('Sem criar conta')
  })

  it('logado: "Começar pelo meu material"', async () => {
    const w = await mountSuspended(AreaPicker, { props: { loggedIn: true } })
    expect(w.find('[data-testid="area-skip"]').text()).toBe('Começar pelo meu material')
  })
})
