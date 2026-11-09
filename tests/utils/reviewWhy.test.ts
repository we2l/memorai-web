import { describe, expect, it, vi } from 'vitest'
import { splitWhy } from '~/composables/useReviewWhy'
import { createReviewShortcutHandler } from '~/composables/useReviewShortcuts'

// "Por quê?" and the keys of the answer band (prd-visual-e2 RF-2.4, RF-2.5)
describe('splitWhy', () => {
  it('separa a linha "Para lembrar:" e tira o negrito do markdown', () => {
    expect(splitWhy('A carência é de **12 contribuições**.\n\nPara lembrar: 12, menos em acidente.')).toEqual({
      text: 'A carência é de 12 contribuições.',
      remember: '12, menos em acidente.',
    })
    expect(splitWhy('Só o texto.')).toEqual({ text: 'Só o texto.', remember: '' })
    expect(splitWhy('Texto\n- Para lembrar: x').remember).toBe('x')
  })
})

describe('teclas com a faixa na tela', () => {
  const base = () => ({
    flip: vi.fn(), rate: vi.fn(), undo: vi.fn(), toggleHelp: vi.fn(), escape: vi.fn(), isFlipped: () => true,
    mode: () => 'two' as const,
  })
  const key = (k: string) => new KeyboardEvent('keydown', { key: k, cancelable: true })

  it('Enter e Espaço continuam, P abre o "Por quê?", U desfaz; 1 e 2 só param a contagem (não avaliam o próximo)', () => {
    const band = { next: vi.fn(), why: vi.fn(), stop: vi.fn() }
    const h = { ...base(), hold: () => band }
    const handler = createReviewShortcutHandler(h)
    for (const k of ['Enter', ' ', 'p', 'u', '2', '1', 'x']) handler(key(k))
    expect(band.next).toHaveBeenCalledTimes(2)
    expect(band.why).toHaveBeenCalledTimes(1)
    expect(h.undo).toHaveBeenCalledTimes(1)
    expect(band.stop).toHaveBeenCalledTimes(3)
    expect(h.rate).not.toHaveBeenCalled()
    expect(h.flip).not.toHaveBeenCalled()
  })

  it('no acerto não há "Por quê?" na faixa; sem faixa, P com o verso abre o do menu', () => {
    const band = { next: vi.fn(), why: null, stop: vi.fn() }
    const why = vi.fn()
    createReviewShortcutHandler({ ...base(), hold: () => band, why })(key('p'))
    expect(band.stop).toHaveBeenCalledTimes(1)
    expect(why).not.toHaveBeenCalled()
    createReviewShortcutHandler({ ...base(), hold: () => null, why })(key('P'))
    expect(why).toHaveBeenCalledTimes(1)
  })
})

describe('meta no fim do lote (Fase 2b)', () => {
  const g = (done: number, target = 2) => ({ batch_size: 10, target_batches: target, done_batches: done, met: done >= target })

  it('o lote que acabou conta mesmo antes do GET /stats ou com o número de antes dele', async () => {
    const { goalAfterBatch } = await import('~/composables/useReviewBatches')
    expect(goalAfterBatch(g(0), null)).toMatchObject({ done_batches: 1, met: false })
    expect(goalAfterBatch(g(0), g(0))).toMatchObject({ done_batches: 1 })
    expect(goalAfterBatch(g(1), g(1))).toMatchObject({ done_batches: 2, met: true })
    expect(goalAfterBatch(g(0), g(2))).toMatchObject({ done_batches: 2, met: true })
    expect(goalAfterBatch(g(2, 2), g(2, 2))).toMatchObject({ done_batches: 2 })
    expect(goalAfterBatch(null, g(1))).toMatchObject({ done_batches: 1 })
    expect(goalAfterBatch(null, null)).toBeNull()
  })
})
