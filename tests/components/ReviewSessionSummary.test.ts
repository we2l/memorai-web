import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import Summary from '~/components/flashcard/ReviewSessionSummary.vue'

const base = { reviewed: 10, ratings: { 1: 1, 2: 1, 3: 6, 4: 2 }, startedAt: Date.now() - 60_000, pendingLearning: 0, topErrorTopic: null }
const links = (w: Awaited<ReturnType<typeof mountSuspended>>) => w.findAll('a').map(a => [a.text(), a.attributes('href')])

describe('ReviewSessionSummary', () => {
  it('sessão de um caderno volta para ele (F1: as áreas devolvem a pessoa)', async () => {
    const w = await mountSuspended(Summary, { props: { ...base, backTo: '/cadernos?topic=t1' } })
    expect(links(w)).toEqual([['Voltar ao caderno', '/cadernos?topic=t1'], ['Voltar para Hoje', '/hoje']])
  })

  it('sessão global volta para Hoje', async () => {
    const w = await mountSuspended(Summary, { props: base })
    expect(links(w)).toEqual([['Voltar para Hoje', '/hoje']])
  })

  it('recorte (F2): "Voltar a {label}" e "Reforçar erros (N)" no mesmo recorte; some com N = 0', async () => {
    const props = { ...base, backTo: '/simulados/q1/resultado', backLabel: 'Voltar a Simulado F2', errorsTo: '/revisar?scope=quiz:q1&errors_only=1' }
    const w = await mountSuspended(Summary, { props: { ...props, errorsCount: 3 } })
    expect(links(w)).toEqual([
      ['Reforçar erros (3)', '/revisar?scope=quiz:q1&errors_only=1'],
      ['Voltar a Simulado F2', '/simulados/q1/resultado'],
      ['Voltar para Hoje', '/hoje'],
    ])
    const none = await mountSuspended(Summary, { props: { ...props, errorsCount: 0, topErrorTopic: { id: 't', name: 'X', count: 2 } } })
    expect(none.find('[data-testid="summary-errors"]').exists()).toBe(false)
    expect(none.text()).not.toContain('Reforçar')
  })
})
