import { afterEach, describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import CardList from '~/components/cards/CardList.vue'
import CardFilters from '~/components/cards/CardFilters.vue'
import { filtersFromQuery } from '~/composables/useCardLibrary'
import type { LibraryCard } from '~/types'
import { axeViolations } from './ui/axe'

enableAutoUnmount(afterEach)
afterEach(() => {
  document.documentElement.classList.remove('dark')
  document.body.innerHTML = ''
})

const card = (id: string, extra: Partial<LibraryCard> = {}) => ({
  id, deck_id: 'd', tags: [], type: 'basic', front: `<p>Pergunta <b>${id}</b></p>`, back: '<p>Resposta</p>', front_audio_url: null, back_audio_url: null,
  state: 'review', due: new Date(Date.now() + 3 * 86_400_000).toISOString(), stability: 1, difficulty: 1, reps: 1, lapses: 0,
  learning_step_index: null, is_learning: false, created_at: '', updated_at: '',
  origin: { kind: 'document', note_id: 'n', title: 'Parte', document_id: 'd', document_name: 'Apostila.pdf', part: { index: 4, total: 6 }, page: null }, ...extra,
}) as LibraryCard

describe('lista da biblioteca (prd-4c-material-v3 RF-F11, RF-F12)', () => {
  it('linha leve (≤ 12 elementos), texto puro, estado em palavras e origem curta; acessível', async () => {
    const w = await mountSuspended(CardList, { attachTo: document.body, props: { cards: [card('a'), card('b')], selected: new Set(['b']), hasMore: true, loadingMore: false, loadMore: async () => 0 } })
    const rows = w.findAll('[data-testid=card-row]')
    expect(rows).toHaveLength(2)
    for (const r of rows) expect(r.element.querySelectorAll('*').length + 1).toBeLessThanOrEqual(12)
    expect(rows[0]!.text()).toContain('Pergunta a')
    expect(rows[0]!.text()).toContain('em dia')
    expect(rows[0]!.text()).toContain('Apostila · parte 4')
    expect(rows[0]!.text()).toContain('vence em 3 d')
    expect(rows[0]!.classes()).toContain('content-auto')
    expect((rows[1]!.find('input').element as HTMLInputElement).checked).toBe(true)
    expect(await axeViolations(w.element)).toEqual([])
  })

  it('Espaço na linha marca; Shift+clique pede intervalo; clique abre', async () => {
    const w = await mountSuspended(CardList, { attachTo: document.body, props: { cards: [card('a'), card('b')], selected: new Set<string>(), hasMore: false, loadingMore: false, loadMore: async () => 0 } })
    const open = w.findAll('[data-testid=card-row-open]')
    await open[0]!.trigger('keydown', { key: ' ' })
    await w.findAll('input')[1]!.trigger('click', { shiftKey: true })
    await open[1]!.trigger('click')
    expect(w.emitted('toggle')).toEqual([['a', false], ['b', true]])
    expect((w.emitted('open')![0]![0] as LibraryCard).id).toBe('b')
  })

  it('"Carregar mais" leva o foco à 1ª linha nova', async () => {
    const cards = [card('a')]
    const w = await mountSuspended(CardList, {
      attachTo: document.body,
      props: { cards, selected: new Set<string>(), hasMore: true, loadingMore: false, loadMore: async () => { await w.setProps({ cards: [...cards, card('b'), card('c')] }); return 2 } },
    })
    await w.find('[data-testid=card-more]').trigger('click')
    await new Promise(r => setTimeout(r, 0))
    await w.vm.$nextTick()
    expect(document.activeElement?.textContent).toContain('Pergunta b')
  })
})

describe('filtros (RF-F10)', () => {
  it('estado é um grupo de botões com aria-pressed; limpar só aparece com filtro', async () => {
    const w = await mountSuspended(CardFilters, { attachTo: document.body, props: { filters: filtersFromQuery({ state: 'due' }), materials: [{ value: 'note:x', label: 'Resumo' }], tags: [] } })
    expect(w.find('[data-testid=card-state-due]').attributes('aria-pressed')).toBe('true')
    await w.find('[data-testid=card-state-new]').trigger('click')
    expect(w.emitted('change')![0]).toEqual([{ state: ['due', 'new'] }, 'state'])
    expect(w.find('[data-testid=card-clear]').exists()).toBe(true)
    document.documentElement.classList.add('dark')
    expect(await axeViolations(w.element)).toEqual([])
  })
})
