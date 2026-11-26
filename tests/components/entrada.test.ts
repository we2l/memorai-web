import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import Tour from '~/components/entrada/Tour.vue'
import Home from '~/components/entrada/Home.vue'
import AreaPicker from '~/components/onboarding/AreaPicker.vue'

const { track } = vi.hoisted(() => ({ track: vi.fn() }))
mockNuxtImport('useAnalytics', () => () => ({ track, register: vi.fn(), identify: vi.fn(), reset: vi.fn() }))
const { countFunnelStep } = vi.hoisted(() => ({ countFunnelStep: vi.fn() }))
vi.mock('~/utils/funnelCount', () => ({ countFunnelStep }))

describe('entrada do /comecar', () => {
  beforeEach(() => {
    track.mockReset()
    countFunnelStep.mockReset()
  })

  it('o card do passo 1: mostra a resposta, Lembrei dá 2 dias e Continuar segue', async () => {
    const w = await mountSuspended(Tour, { props: { step: 0, catalog: null, failed: false, flow: false } })
    expect(w.find('[data-testid="entry-answer"]').exists()).toBe(false)
    await w.find('[data-testid="entry-flip"]').trigger('click')
    expect(w.find('[data-testid="entry-answer"]').text()).toContain('12 contribuições mensais')
    await w.find('[data-testid="entry-remembered"]').trigger('click')
    expect(w.find('[data-testid="entry-feedback"]').text()).toContain('daqui a 2 dias')
    expect(track).toHaveBeenCalledWith('entry_card_rated', { rating: 'remembered', position: 'tour' })
    // the aggregate funnel (no cookie, no id) counts the same moment
    await flushPromises()
    expect(countFunnelStep).toHaveBeenCalledWith(expect.any(String), 'entry_card_rated', false)
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

  it.each([
    ['entry-signup', 'hero_signup'],
    ['entry-final-signup', 'final_signup'],
  ])('o clique em %s conta no funil agregado como %s', async (testid, step) => {
    const w = await mountSuspended(Home, { props: { catalog: null, loginTo: '/entrar' } })
    await w.find(`[data-testid="${testid}"]`).trigger('click')
    await vi.waitFor(() => expect(countFunnelStep).toHaveBeenCalledWith(expect.any(String), step, false))
    expect(countFunnelStep).toHaveBeenCalledTimes(1)
  })

  it('Criar conta grátis do último passo conta como final_signup; Entrar não conta', async () => {
    const home = await mountSuspended(Home, { props: { catalog: null, loginTo: '/entrar' } })
    await home.find('[data-testid="entry-login"]').trigger('click')
    const tour = await mountSuspended(Tour, { props: { step: 6, catalog: null, failed: true, flow: false } })
    await tour.find('[data-testid="entry-plans-signup"]').trigger('click')
    await vi.waitFor(() => expect(countFunnelStep).toHaveBeenCalledWith(expect.any(String), 'final_signup', false))
    expect(countFunnelStep).toHaveBeenCalledTimes(1)
  })

  it('a entrada: cada recurso abre o seu passo; nunca "app"', async () => {
    const w = await mountSuspended(Home, { props: { catalog: null, loginTo: '/entrar' } })
    await w.find('[data-testid="entry-feature-5"]').trigger('click')
    expect(w.emitted('start')).toEqual([[4, 'feature']])
    await w.find('[data-testid="entry-start"]').trigger('click')
    expect(w.emitted('start')![1]).toEqual([1, 'hero'])
    expect(w.find('h1').text()).toContain('esquecer.')
    expect(w.text()).not.toMatch(/\bapp\b|aplicativo/i)
  })
})

describe('card no herói (prd-entrada-primeira-dobra RF-1)', () => {
  beforeEach(() => { track.mockReset(); countFunnelStep.mockReset() })

  it('um primário por vez: Mostrar resposta, Lembrei e Continuar para o passo 2', async () => {
    const w = await mountSuspended(Home, { props: { catalog: null, loginTo: '/entrar' } })
    const card = w.find('[data-testid="entry-hero-card"]')
    expect(card.attributes('role')).toBe('group')
    expect(card.text()).toContain('auxílio por incapacidade temporária')
    expect(w.findAll('.ec-hero .ec-btn-primary')).toHaveLength(1)
    await w.find('[data-testid="entry-hero-flip"]').trigger('click')
    expect(w.find('[data-testid="entry-answer"]').text()).toContain('12 contribuições mensais')
    expect(w.findAll('.ec-hero .ec-btn-primary')).toHaveLength(1)
    await w.find('[data-testid="entry-hero-remembered"]').trigger('click')
    expect(w.find('[data-testid="entry-feedback"]').text()).toContain('daqui a 2 dias')
    expect(track).toHaveBeenCalledWith('entry_card_rated', { rating: 'remembered', position: 'hero' })
    await flushPromises()
    expect(countFunnelStep).toHaveBeenCalledWith(expect.any(String), 'entry_card_rated', false)
    const next = w.find('[data-testid="entry-hero-next"]')
    expect(next.text()).toBe('Continuar: ver o resto em 1 min')
    await next.trigger('click')
    expect(w.emitted('start')).toEqual([[1, 'hero']])
    expect(track).toHaveBeenCalledWith('entry_cta_clicked', { position: 'hero_card_next' })
  })

  it('teclas só com o foco no card: Espaço vira, 1 avalia; na janela nada acontece', async () => {
    const w = await mountSuspended(Home, { props: { catalog: null, loginTo: '/entrar' }, attachTo: document.body })
    window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }))
    await flushPromises()
    expect(w.find('[data-testid="entry-answer"]').exists()).toBe(false)
    const card = w.find('[data-testid="entry-hero-card"]')
    await card.trigger('keydown', { key: ' ' })
    expect(w.find('[data-testid="entry-answer"]').exists()).toBe(true)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }))
    await flushPromises()
    expect(w.find('[data-testid="entry-feedback"]').exists()).toBe(false)
    await card.trigger('keydown', { key: '1' })
    expect(w.find('[data-testid="entry-feedback"]').text()).toContain('amanhã')
    expect(track).toHaveBeenCalledWith('entry_card_rated', { rating: 'forgot', position: 'hero' })
    w.unmount()
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
