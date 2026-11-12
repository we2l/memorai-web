import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount, flushPromises } from '@vue/test-utils'
import SubjectBlock from '~/components/edital/SubjectBlock.vue'
import EditalPage from '~/pages/cadernos/edital.vue'
import type { EditalReadResult } from '~/types'
import { toEditalDraft } from '~/utils/editalProposal'

const { readMock, applyMock } = vi.hoisted(() => ({ readMock: vi.fn(), applyMock: vi.fn() }))
mockNuxtImport('useEditalReader', () => () => ({ read: readMock, apply: applyMock }))
mockNuxtImport('useDocumentUpload', () => () => ({ validate: async () => null }))

enableAutoUnmount(afterEach)
beforeEach(() => {
  readMock.mockReset()
  applyMock.mockReset()
})

const proposal = {
  name: 'TJ-SP · Oficial de Justiça',
  exam_date: '2027-03-14',
  subjects: [
    { name: 'Direito Penal', topics: [{ name: 'Código Penal', description: 'artigos 1º a 12; 100 a 106' }] },
    { name: 'Língua Portuguesa', topics: [{ name: 'Crase', description: null }, { name: 'Pontuação', description: null }, { name: 'Regência', description: null }] },
  ],
}
const ready: EditalReadResult = {
  status: 'ready', proposal, alternatives: undefined,
  source: { kind: 'pdf', pages: { from: 124, to: 125 }, total_pages: 182, found: 'heading', truncated: false },
  counts: { subjects: 2, topics: 4 }, applied_topic_id: null,
}
const choose: EditalReadResult = {
  status: 'choose', proposal: null,
  alternatives: [
    { section: 0, label: 'Edital 01/2026 · Oficial de Justiça', pages: { from: 124, to: 125 } },
    { section: 1, label: 'Edital 02/2026 · Escrevente Técnico Judiciário', pages: { from: 154, to: 156 } },
  ],
  source: { kind: 'pdf', pages: null, total_pages: 182, found: 'heading', truncated: false },
  counts: { subjects: 0, topics: 0 }, applied_topic_id: null,
}

describe('EditalSubjectBlock', () => {
  it('fechada, a matéria de 1-2 assuntos diz quais; aberta, mostra os artigos inteiros sob o assunto', async () => {
    const draft = toEditalDraft(proposal)
    const w = await mountSuspended(SubjectBlock, { props: { modelValue: draft.subjects[0]!, index: 0, canAdd: true } })
    expect(w.get('[data-testid="edital-subject-toggle"]').text()).toBe('1 assunto: Código Penal')
    await w.get('[data-testid="edital-subject-toggle"]').trigger('click')
    expect(w.get('[data-testid="edital-topic-description"]').text()).toBe('artigos 1º a 12; 100 a 106')
    expect(w.get('[data-testid="edital-topic-description"]').classes()).not.toContain('line-clamp-2')

    const many = await mountSuspended(SubjectBlock, { props: { modelValue: draft.subjects[1]!, index: 1, canAdd: true } })
    expect(many.find('[data-testid="edital-subject-preview"]').exists()).toBe(false)
  })
})

async function pickPdf(w: Awaited<ReturnType<typeof mountSuspended>>) {
  const input = w.get('input[type="file"]')
  Object.defineProperty(input.element, 'files', { value: [new File(['%PDF'], 'diario.pdf', { type: 'application/pdf' })], configurable: true })
  await input.trigger('change')
  await flushPromises()
}

describe('Página do edital', () => {
  it('a escolha do Diário relê pela seção, não pelas páginas', async () => {
    readMock.mockResolvedValueOnce({ jobId: 'j1', result: choose }).mockResolvedValueOnce({ jobId: 'j2', result: ready })
    const w = await mountSuspended(EditalPage)
    await pickPdf(w)
    await w.get('form').trigger('submit')
    await flushPromises()
    const alts = w.findAll('[data-testid="edital-alternative"]')
    expect(alts.map(a => a.text())).toEqual([expect.stringContaining('Oficial de Justiça'), expect.stringContaining('Escrevente')])
    await alts[1]!.trigger('click')
    await flushPromises()
    expect(readMock.mock.calls.at(-1)![0]).toMatchObject({ section: 1, pageFrom: undefined, pageTo: undefined })
    expect(w.find('[data-testid="edital-exam-date"]').exists()).toBe(true)
  })

  it('409 caderno_name_taken: avisa, abre o existente ou cria outro com allow_duplicate', async () => {
    readMock.mockResolvedValueOnce({ jobId: 'j2', result: ready })
    applyMock.mockRejectedValueOnce({ status: 409, data: { code: 'caderno_name_taken', message: 'Já existe um caderno com esse nome.', topic: { id: 't9', name: 'TJ-SP · Oficial de Justiça' } } })
      .mockResolvedValueOnce({ topic: { id: 't10', name: 'x', color: null, learning_mode: 'exam' }, counts: { subjects: 2, topics: 4 }, exam: null, exam_skipped: null })
    const w = await mountSuspended(EditalPage)
    await pickPdf(w)
    await w.get('form').trigger('submit')
    await flushPromises()
    await w.get('[data-testid="edital-apply"]').trigger('click')
    await flushPromises()
    const warn = w.get('[data-testid="edital-name-taken"]')
    expect(warn.attributes('role')).toBe('alert')
    expect(warn.text()).toContain('Já existe um caderno com esse nome')
    expect(w.get('[data-testid="edital-open-existing"]').attributes('href')).toBe('/cadernos/t9')
    expect(applyMock.mock.calls[0]![1]).not.toHaveProperty('allow_duplicate')
    await w.get('[data-testid="edital-create-anyway"]').trigger('click')
    await flushPromises()
    expect(applyMock.mock.calls[1]![1]).toMatchObject({ allow_duplicate: true, name: 'TJ-SP · Oficial de Justiça' })
  })
})
