import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useQuizStore } from '~/stores/quiz'
import { quizConflict, quizConflictMessage } from '~/utils/quizConflict'

// API #177: the 409 of a simulado. Finishing one the Prova's timer already finished opens the result, no error
const { apiMock } = vi.hoisted(() => ({ apiMock: vi.fn() }))
mockNuxtImport('useNuxtApp', original => () => new Proxy(original(), {
  get: (target, key) => (key === '$api' ? apiMock : Reflect.get(target, key)),
}))

const conflict = (code: string) => Object.assign(new Error('409'), { response: { status: 409 }, data: { code } })

describe('quizConflict', () => {
  it('reconhece só os 409 do simulado', () => {
    expect(quizConflict(conflict('quiz_not_in_progress'))).toBe('quiz_not_in_progress')
    expect(quizConflict(conflict('question_already_graded'))).toBe('question_already_graded')
    expect(quizConflict(conflict('quiz_completed'))).toBe('quiz_completed')
    expect(quizConflict(conflict('import_already_confirmed'))).toBeNull()
    expect(quizConflict(Object.assign(new Error('422'), { response: { status: 422 }, data: { code: 'quiz_completed' } }))).toBeNull()
    expect(quizConflict(new TypeError('fetch failed'))).toBeNull()
  })

  it('mensagem clara para cada um', () => {
    expect(quizConflictMessage('question_already_graded')).toMatch(/já foi corrigida/)
    expect(quizConflictMessage('quiz_completed')).toBe('Este simulado já foi finalizado.')
    expect(quizConflictMessage('quiz_not_in_progress')).toBe('Este simulado não está mais em andamento.')
  })
})

describe('quiz store: finishQuiz', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    apiMock.mockReset()
  })

  it('409 quiz_not_in_progress recarrega o simulado e devolve o concluído, sem erro', async () => {
    const store = useQuizStore()
    store.currentQuiz = { id: 'q1', status: 'in_progress', started_at: new Date().toISOString() } as never
    apiMock.mockImplementation((url: string) => url.endsWith('/finish')
      ? Promise.reject(conflict('quiz_not_in_progress'))
      : Promise.resolve({ data: { id: 'q1', status: 'completed', questions: [{ id: 'a' }] } }))

    const done = await store.finishQuiz()

    expect(apiMock).toHaveBeenCalledWith('/quizzes/q1', expect.anything())
    expect(done?.status).toBe('completed')
    expect(store.currentQuiz?.status).toBe('completed')
    expect(store.questions).toHaveLength(1)
  })

  it('outro erro continua subindo', async () => {
    const store = useQuizStore()
    store.currentQuiz = { id: 'q1', status: 'in_progress' } as never
    apiMock.mockRejectedValue(Object.assign(new Error('500'), { response: { status: 500 } }))
    await expect(store.finishQuiz()).rejects.toThrow('500')
  })
})
