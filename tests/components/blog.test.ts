import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import BlogQuiz from '~/components/blog/Quiz.vue'
import ForgettingCalculator from '~/components/blog/ForgettingCalculator.vue'
import ExamPlanner from '~/components/blog/ExamPlanner.vue'
import ExampleCard from '~/components/blog/ExampleCard.vue'
import Toc from '~/components/blog/Toc.vue'

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
      await w.get(`[data-testid="rate-${ok ? 3 : 1}"]`).trigger('click')
      // The review's band, compact (Fase 2b): where the card goes, then "Continuar"
      const band = w.get('[data-testid="review-feedback"]')
      expect(band.attributes('data-compact')).toBe('true')
      expect(band.text()).toContain(ok ? 'Volta em 2 dias.' : 'Ele volta ainda hoje.')
      expect(w.find('[data-testid="review-why"]').exists()).toBe(false)
      await w.get('[data-testid="review-continue"]').trigger('click')
    }
    const result = w.get('[data-testid="blog-quiz-result"]').text()
    expect(result).toContain('Você lembrou 2 de 3')
    expect(result).toContain('voltariam em 2 dias')
    expect(w.get('[data-testid="ui-arc"]').attributes('data-got')).toBe('2')
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
    expect(w.get('[data-testid="review-feedback"]').attributes('data-kind')).toBe('again')
    // 2 behind the band does not rate the card; Enter goes on
    await quiz.trigger('keydown', { key: '2' })
    expect(w.get('[data-testid="blog-quiz-count"]').text()).toBe('1 de 3')
    await quiz.trigger('keydown', { key: 'Enter' })
    expect(w.find('[data-testid="review-feedback"]').exists()).toBe(false)
    expect(w.get('[data-testid="blog-quiz-count"]').text()).toBe('2 de 3')
  })
})

describe('card de exemplo que vira (prd-blog-v2 RF-V2)', () => {
  it('mouse: Mostrar resposta, Lembrei, faixa do golfinho, Continuar e Testar de novo', async () => {
    const w = await mountSuspended(ExampleCard, { props: { q: 'Até que valor?', a: '40 salários mínimos', source: 'Lei 9.099/1995, art. 3º, I' } })
    expect(w.get('[data-testid="blog-example-answer"]').attributes('style')).toContain('display: none')
    await w.get('[data-testid="blog-example-reveal"]').trigger('click')
    expect(w.get('[data-testid="blog-example-answer"]').attributes('style') ?? '').not.toContain('display: none')
    await w.get('[data-testid="blog-example-ok"]').trigger('click')
    const band = w.get('[data-testid="review-feedback"]')
    expect(band.attributes('data-kind')).toBe('ok')
    expect(band.attributes('data-compact')).toBe('true')
    expect(band.text()).toContain('Volta em 2 dias.')
    await w.get('[data-testid="review-continue"]').trigger('click')
    expect(w.text()).toContain('voltaria em 2 dias')
    await w.get('[data-testid="blog-example-again-try"]').trigger('click')
    expect(w.find('[data-testid="blog-example-reveal"]').exists()).toBe(true)
  })

  it('teclado: Espaço mostra, 1 = Não lembrei (âmbar, volta ainda hoje), Enter segue', async () => {
    const w = await mountSuspended(ExampleCard, { props: { q: 'P?', a: 'R' } })
    const card = w.get('[data-testid="blog-example-card"]')
    await card.trigger('keydown', { key: ' ' })
    expect(card.attributes('data-state')).toBe('back')
    await card.trigger('keydown', { key: '1' })
    expect(w.get('[data-testid="review-feedback"]').attributes('data-kind')).toBe('again')
    expect(w.get('[data-testid="review-feedback"]').text()).toContain('Ele volta ainda hoje.')
    await card.trigger('keydown', { key: 'Enter' })
    expect(w.find('[data-testid="review-feedback"]').exists()).toBe(false)
    expect(card.attributes('data-state')).toBe('done')
  })
})

describe('sumário (prd-blog-v2 RF-L3)', () => {
  it('a 1ª seção começa marcada e a caixa recolhível conta as seções', async () => {
    const w = await mountSuspended(Toc, { props: { items: [{ id: 'a', title: 'A' }, { id: 'b', title: 'B' }] } })
    expect(w.get('[data-testid="blog-toc"] a[aria-current="location"]').text()).toBe('A')
    expect(w.get('[data-testid="blog-toc-collapsible"]').text()).toContain('2 seções')
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
