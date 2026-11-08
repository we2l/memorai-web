import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import BlogQuiz from '~/components/blog/Quiz.vue'
import ForgettingCalculator from '~/components/blog/ForgettingCalculator.vue'
import ExamPlanner from '~/components/blog/ExamPlanner.vue'

const cards = [
  { q: 'Carência do auxílio por incapacidade temporária?', a: '12 contribuições mensais', source: 'Lei 8.213/1991, art. 25, I' },
  { q: 'Duração do salário-maternidade?', a: '120 dias', source: 'Lei 8.213/1991, art. 71' },
  { q: 'Quanto vale o auxílio-acidente?', a: '50% do salário de benefício', source: 'Lei 8.213/1991, art. 86, § 1º' },
]

describe('BlogQuiz (prd-blog-seo RF-B9)', () => {
  it('como a revisão do app: resposta, Lembrei/Não lembrei com retorno, e o fim leva ao mini-lote com UTM', async () => {
    const w = await mountSuspended(BlogQuiz, { props: { slug: 'lei-seca', area: 'concurso', cards } })
    expect(w.find('[data-testid="blog-quiz-answer"]').exists()).toBe(false)
    for (const ok of [true, false, true]) {
      await w.get('[data-testid="blog-quiz-reveal"]').trigger('click')
      expect(w.get('[data-testid="blog-quiz-answer"]').text()).toContain('Fonte:')
      await w.get(`[data-testid="blog-quiz-${ok ? 'remembered' : 'forgot'}"]`).trigger('click')
      if (!ok) expect(w.get('[data-testid="blog-quiz-feedback"]').text()).toContain('Não lembrei · volta ainda hoje')
    }
    const result = w.get('[data-testid="blog-quiz-result"]').text()
    expect(result).toContain('Você lembrou 2 de 3')
    expect(result).toContain('voltariam em 2 dias')
    expect(w.get('[data-testid="blog-quiz-cta"]').text()).toContain('Revisar 6 cards de concurso sem criar conta')
    expect(w.get('[data-testid="blog-quiz-cta"]').attributes('href')).toBe('/comecar/concurso?utm_source=blog&utm_medium=organic&utm_campaign=blog&utm_content=lei-seca-quiz')
    // The full list stays in the HTML, outside the exercise
    expect(w.get('details').text()).toContain('Duração do salário-maternidade?')
  })

  it('teclado: Espaço mostra, 1 = Não lembrei, 2 = Lembrei', async () => {
    const w = await mountSuspended(BlogQuiz, { props: { slug: 'x', area: 'enem', cards } })
    const quiz = w.get('[data-testid="blog-quiz"]')
    await quiz.trigger('keydown', { key: '2' })
    expect(w.get('[data-testid="blog-quiz-count"]').text()).toBe('1 de 3')
    await quiz.trigger('keydown', { key: ' ' })
    expect(w.find('[data-testid="blog-quiz-answer"]').exists()).toBe(true)
    await quiz.trigger('keydown', { key: '1' })
    expect(w.get('[data-testid="blog-quiz-feedback"]').text()).toContain('Não lembrei')
    expect(w.get('[data-testid="blog-quiz-count"]').text()).toBe('2 de 3')
  })
})

describe('ferramentas (RF-T1, RF-T2)', () => {
  it('a calculadora começa em 10 dias, 1 vez, e recalcula', async () => {
    const w = await mountSuspended(ForgettingCalculator, { props: {} })
    expect(w.get('[data-testid="tool-forgetting-percent"]').text()).toBe('77%')
    await w.get('#forgetting-days').setValue('30')
    expect(w.get('[data-testid="tool-forgetting-percent"]').text()).toBe('67%')
    await w.get('#forgetting-days').setValue('900')
    expect(w.text()).toContain('Use um número de 0 a 365')
  })

  it('o plano mostra os números do padrão e reprova data passada', async () => {
    const w = await mountSuspended(ExamPlanner, { props: {} })
    expect(w.get('[data-testid="tool-plan-new"]').text()).toBe('7')
    await w.get('#plan-date').setValue('2000-01-01')
    expect(w.text()).toContain('Escolha uma data a partir de amanhã')
    expect(w.find('[data-testid="tool-plan-result"]').exists()).toBe(false)
  })
})
