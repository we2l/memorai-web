import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import PasteSheet from '~/components/question/PasteSheet.vue'
import ViewDialog from '~/components/question/ViewDialog.vue'
import { axeViolations } from './ui/axe'

// "Colar questão errada" (prd-questao-errada RF-F2, RF-F5)

const { apiMock, trackMock, navigateToMock, route } = vi.hoisted(() => ({
  apiMock: vi.fn(),
  trackMock: vi.fn(),
  navigateToMock: vi.fn(),
  route: { path: '/hoje', query: {} as Record<string, string>, params: {}, meta: {}, fullPath: '/hoje' },
}))

mockNuxtImport('useNuxtApp', original => () => new Proxy(original(), {
  get: (target, key) => (key === '$api' ? apiMock : Reflect.get(target, key)),
}))
mockNuxtImport('useAnalytics', () => () => ({ track: trackMock, identify: vi.fn(), reset: vi.fn() }))
mockNuxtImport('navigateTo', () => navigateToMock)
mockNuxtImport('useRoute', () => () => route)

enableAutoUnmount(afterEach)
const tick = async () => { await flushPromises(); await nextTick(); await new Promise(r => setTimeout(r, 0)) }

const TREE = [
  { id: 't1', name: 'TRF 4ª Região', parent_id: null, children: [{ id: 't1a', name: 'Direito Constitucional', parent_id: 't1', children: [] }] },
]

const FGV = `(FGV - 2023 - TJ-RJ) Sobre o controle concentrado, assinale a correta.
(A) A ADI cabe contra lei municipal.
(B) A ADPF é subsidiária.
Gabarito: B`

function memoryStorage(): Storage {
  const m = new Map<string, string>()
  return {
    get length() { return m.size },
    key: (i: number) => [...m.keys()][i] ?? null,
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => { m.set(k, String(v)) },
    removeItem: (k: string) => { m.delete(k) },
    clear: () => m.clear(),
  }
}

beforeEach(() => {
  vi.stubGlobal('localStorage', memoryStorage())
  apiMock.mockReset()
  trackMock.mockReset()
  navigateToMock.mockReset()
  document.body.innerHTML = ''
  usePasteQuestion().open.value = false
  useAuthStore().user = { id: 'u1', name: 'Rafael', email: 'r@exemplo.com', plan: 'free' } as any
  useTopicStore().tree = structuredClone(TREE) as any
})

async function openWith(text: string, topic = 't1a') {
  await mountSuspended(PasteSheet, { attachTo: document.body })
  usePasteQuestion().show('library', topic)
  await tick()
  const dialog = document.querySelector('[role="dialog"]') as HTMLElement
  const textarea = dialog.querySelector('[data-testid=question-text] textarea, textarea[data-testid=question-text]') as HTMLTextAreaElement ?? dialog.querySelector('textarea')!
  textarea.value = text
  textarea.dispatchEvent(new Event('input'))
  await tick()
  ;(dialog.querySelector('[data-testid=question-separate]') as HTMLButtonElement).click()
  await tick()
  return dialog
}

describe('QuestionPasteSheet', () => {
  it('cola, separa, mostra os campos e cria o card no assunto escolhido, sem IA', async () => {
    apiMock.mockImplementation(async (url: string) => (url === '/topics'
      ? { data: structuredClone(TREE) }
      : { data: { questions: [{ id: 'pq1', flashcard_id: 'c1' }], card_ids: ['c1'], session_count: 1, topic: { id: 't1a', name: 'Direito Constitucional' } } }))
    const dialog = await openWith(FGV)
    expect(dialog.textContent).toContain('Achamos 1 questão.')
    expect((dialog.querySelector('[data-testid=question-stem] textarea, textarea') as HTMLTextAreaElement).value).toBe('Sobre o controle concentrado, assinale a correta.')
    const checked = dialog.querySelector('[data-testid=question-answer] input:checked, fieldset input[value="B"]:checked') as HTMLInputElement
    expect(checked?.value).toBe('B')
    expect(await axeViolations(dialog)).toEqual([])

    ;(dialog.querySelector('[data-testid=question-reason-confused]') as HTMLButtonElement).click()
    await tick()
    ;(dialog.querySelector('[data-testid=question-create]') as HTMLButtonElement).click()
    await tick()

    expect(apiMock).toHaveBeenCalledWith('/pasted-questions', expect.objectContaining({
      method: 'POST',
      body: {
        topic_id: 't1a',
        questions: [expect.objectContaining({ kind: 'multiple_choice', answer: 'B', source: 'FGV - 2023 - TJ-RJ', error_reason: 'confused', alternatives: [{ letter: 'A', text: 'A ADI cabe contra lei municipal.' }, { letter: 'B', text: 'A ADPF é subsidiária.' }] })],
      },
    }))
    expect(trackMock).toHaveBeenCalledWith('question_pasted', { count: 1, edited: true, with_reason: true })
    expect(usePasteQuestion().open.value).toBe(false)
    expect(usePasteQuestion().created.value).toBeGreaterThan(0)
  })

  it('sem gabarito avisa e não envia até marcar a resposta', async () => {
    const dialog = await openWith('O habeas data protege a locomoção.\nCerto\nErrado')
    expect(dialog.querySelector('[data-testid=question-warning]')?.textContent).toContain('Não achamos o gabarito')
    ;(dialog.querySelector('[data-testid=question-create]') as HTMLButtonElement).click()
    await tick()
    expect(apiMock).not.toHaveBeenCalled()
    expect(dialog.textContent).toContain('Marque Certo ou Errado.')
  })

  it('várias questões viram linhas recolhíveis; o 422 da API abre a questão com erro', async () => {
    apiMock.mockRejectedValue({ status: 422, statusCode: 422, data: { errors: { 'questions.1.stem': ['Falta o enunciado da questão.'] } } })
    const dialog = await openWith(`1. Primeira?\na) x\nb) y\nGabarito: A\n2. Segunda?\na) z\nb) w\nGabarito: B`)
    expect(dialog.textContent).toContain('Achamos 2 questões.')
    const rows = [...dialog.querySelectorAll('[data-testid^=question-row-]')]
    expect(rows.map(r => r.getAttribute('aria-expanded'))).toEqual(['true', 'false'])
    expect(rows[1]!.textContent).toContain('2. Múltipla escolha · Gabarito: B')
    ;(dialog.querySelector('[data-testid=question-create]') as HTMLButtonElement).click()
    await tick()
    expect(dialog.querySelector('[data-testid=question-create]')?.textContent).toContain('Criar 2 cards')
    expect([...dialog.querySelectorAll('[data-testid^=question-row-]')].map(r => r.getAttribute('aria-expanded'))).toEqual(['false', 'true'])
    expect(dialog.textContent).toContain('Falta o enunciado da questão.')
  })
})

describe('QuestionViewDialog', () => {
  it('mostra a questão como texto (nunca HTML), com o gabarito marcado e o motivo', async () => {
    apiMock.mockResolvedValue({ data: { id: 'pq1', kind: 'multiple_choice', stem: '<img src=x onerror=alert(1)> Enunciado', alternatives: [{ letter: 'A', text: 'um' }, { letter: 'B', text: 'dois' }], answer: 'B', explanation: 'Porque sim.', error_reason: 'forgot', error_note: 'esqueci o prazo', source: 'FCC · 2019', raw_text: 'cru', card_ids: ['c1'] } })
    await mountSuspended(ViewDialog, { attachTo: document.body, props: { modelValue: true, questionId: 'pq1' } })
    await tick()
    const dialog = document.querySelector('[role="dialog"]') as HTMLElement
    expect(apiMock).toHaveBeenCalledWith('/pasted-questions/pq1')
    expect(dialog.querySelector('img')).toBeNull()
    expect(dialog.textContent).toContain('<img src=x onerror=alert(1)> Enunciado')
    expect(dialog.textContent).toContain('dois (gabarito)')
    expect(dialog.textContent).toContain('Por que errei: Esqueci — esqueci o prazo')
    expect(await axeViolations(dialog)).toEqual([])
  })
})
