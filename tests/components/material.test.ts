import { afterEach, describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import MaterialCardsPanel from '~/components/material/MaterialCardsPanel.vue'
import MaterialOutline from '~/components/material/MaterialOutline.vue'
import SelectionActions from '~/components/material/SelectionActions.vue'
import type { LibraryCard, NoteMaterial } from '~/types'
import { axeViolations } from './ui/axe'

enableAutoUnmount(afterEach)
afterEach(() => {
  document.documentElement.classList.remove('dark')
  document.body.innerHTML = ''
})

const NOTE = 'n1'
function context(cards: Partial<NoteMaterial['cards']> = {}, can: NoteMaterial['can_generate'] = { ok: true, remaining: 9 }): NoteMaterial {
  return {
    note: { id: NOTE, title: 'Controle', topic_id: 't1', word_count: 1200, kind: 'part', updated_at: '' },
    path: [{ id: 'root', name: 'TRF' }, { id: 't1', name: 'Constitucional' }],
    document: { id: 'd1', name: 'Apostila.pdf', pages: 212, status: 'ready' },
    parts: [{ note_id: NOTE, index: 1, title: 'Controle', page_start: null, page_end: null, cards: 0, mastery: null, session_count: 0, status: 'ready' }],
    cards: { total: 0, session_count: 0, ahead_count: 0, errors_count: 0, ...cards },
    can_generate: can,
  }
}
const card = (id: string, extra: Partial<LibraryCard> = {}) => ({
  id, deck_id: 'd', tags: [], type: 'basic', front: `<p>Pergunta ${id}</p>`, back: 'R', front_audio_url: null, back_audio_url: null,
  state: 'review', due: new Date(Date.now() - 2 * 86_400_000).toISOString(), stability: 1, difficulty: 1, reps: 1, lapses: 0,
  learning_step_index: null, is_learning: false, created_at: '', updated_at: '', ...extra,
}) as LibraryCard

describe('"Cards desta parte" (prd-4c-material-v3 RF-F4, RF-F8)', () => {
  it('sem cards: convite com a cota dita antes e o primário "Gerar"', async () => {
    const w = await mountSuspended(MaterialCardsPanel, { attachTo: document.body, props: { context: context(), cards: [], topicId: 't1', noteId: NOTE, primary: 'generate' } })
    expect(w.text()).toContain('Esta parte ainda não tem cards')
    expect(w.text()).toContain('Usa 1 das suas 9 gerações do mês · cerca de 15 cards')
    expect(w.find('[data-testid=panel-generate]').text()).toContain('Gerar cards desta parte com IA')
    expect(await axeViolations(w.element)).toEqual([])
  })

  it('sem cota: "Ver planos" no lugar do botão', async () => {
    const w = await mountSuspended(MaterialCardsPanel, { attachTo: document.body, props: { context: context({}, { ok: false, code: 'feature_limit_reached', remaining: 0 }), cards: [], topicId: 't1', noteId: NOTE } })
    expect(w.find('[data-testid=panel-generate]').exists()).toBe(false)
    expect(w.text()).toContain('Ver planos')
  })

  it('com cards: o estado em palavras, "Revisar estes N" = a sessão da nota e "Ver os N cards" com origin=note:', async () => {
    const w = await mountSuspended(MaterialCardsPanel, {
      props: { context: context({ total: 14, session_count: 6, ahead_count: 14, errors_count: 2 }), cards: [card('a'), card('b', { state: 'new', due: null })], topicId: 't1', noteId: NOTE, primary: 'review' },
    })
    const rows = w.findAll('[data-testid=panel-card]')
    expect(rows.map(r => r.text().replace(/\s+/g, ''))).toEqual(['Perguntaaatrasado', 'Perguntabnovo'])
    const review = w.find('[data-testid=panel-review]')
    expect(review.text()).toBe('Revisar estes 6 de hoje')
    expect(review.attributes('href')).toBe(`/revisar?scope=note:${NOTE}`)
    expect(w.find('[data-testid=panel-library]').attributes('href')).toBe(`/cadernos/t1/cards?origin=note:${NOTE}`)
    expect(w.text()).toContain('Cards desta parte (14)')
    document.documentElement.classList.add('dark')
    expect(await axeViolations(document.body)).toEqual([])
  })

  it('0 para hoje: "Praticar adiantado (N)"', async () => {
    const w = await mountSuspended(MaterialCardsPanel, { attachTo: document.body, props: { context: context({ total: 3, session_count: 0, ahead_count: 3 }), cards: [card('a')], topicId: 't1', noteId: NOTE } })
    expect(w.find('[data-testid=panel-review]').exists()).toBe(false)
    expect(w.find('[data-testid=panel-ahead]').attributes('href')).toBe(`/revisar?scope=note:${NOTE}&ahead=1`)
  })
})

describe('sumário (RF-F3)', () => {
  it('parte aberta com aria-current e títulos da nota, num <nav> "Partes do material"', async () => {
    const w = await mountSuspended(MaterialOutline, {
      attachTo: document.body,
      props: {
        parts: context().parts.map(p => ({ ...p, cards: 31, mastery: 62 })), pages: 212, currentNoteId: NOTE, topicId: 't1',
        headings: [{ index: 0, level: 2, text: 'Conceito' }, { index: 1, level: 3, text: 'Espécies' }], active: 1,
      },
    })
    expect(w.find('nav').attributes('aria-label')).toBe('Partes do material')
    expect(w.find('[aria-current=page]').text()).toContain('31 cards · 62%')
    const hs = w.findAll('[data-testid=outline-heading]')
    expect(hs[1]!.attributes('aria-current')).toBe('location')
    await hs[0]!.trigger('click')
    expect(w.emitted('go')![0]).toEqual([{ index: 0, level: 2, text: 'Conceito' }])
    expect(await axeViolations(w.element)).toEqual([])
  })
})

describe('ações sobre o trecho (RF-F5)', () => {
  async function select(text: string) {
    const root = document.createElement('div')
    root.innerHTML = `<p>${text}</p>`
    document.body.appendChild(root)
    const w = await mountSuspended(SelectionActions, { props: { root }, attachTo: root })
    const range = document.createRange()
    range.selectNodeContents(root.querySelector('p')!)
    const sel = window.getSelection()!
    sel.removeAllRanges()
    sel.addRange(range)
    document.dispatchEvent(new Event('selectionchange'))
    await new Promise(r => setTimeout(r, 50))
    return w
  }

  it('trecho curto: "Gerar 3 cards" desabilitado com o motivo; "Criar card" emite o texto', async () => {
    const w = await select('Supremacia formal.')
    const bar = w.find('[data-testid=selection-actions]')
    expect(bar.exists()).toBe(true)
    const ai = bar.findAll('button').find(b => b.text().includes('Gerar 3 cards'))!
    expect(ai.attributes('disabled')).toBeDefined()
    expect(bar.text()).toContain('selecione pelo menos uma frase')
    await bar.findAll('button').find(b => b.text() === 'Criar card')!.trigger('click')
    expect(w.emitted('action')![0]).toEqual(['card', 'Supremacia formal.'])
  })

  it('acima de 4 mil caracteres: o motivo é o tamanho', async () => {
    const w = await select('a'.repeat(4001))
    expect(w.text()).toContain('selecione até 4 mil caracteres')
  })
})
