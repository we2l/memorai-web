import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import Summary from '~/components/flashcard/ReviewSessionSummary.vue'

const base = { reviewed: 10, ratings: { 1: 1, 2: 1, 3: 6, 4: 2 }, startedAt: Date.now() - 60_000, pendingLearning: 0, topErrorTopic: null }
const links = (w: Awaited<ReturnType<typeof mountSuspended>>) => w.findAll('a').map(a => [a.text(), a.attributes('href')])

describe('ReviewSessionSummary', () => {
  it('sessão de um caderno volta para ele (F1: as áreas devolvem a pessoa)', async () => {
    const w = await mountSuspended(Summary, { props: { ...base, cadernoTo: '/cadernos?topic=t1' } })
    expect(links(w)).toEqual([['Voltar ao caderno', '/cadernos?topic=t1'], ['Voltar para Hoje', '/hoje']])
  })

  it('sessão global volta para Hoje', async () => {
    const w = await mountSuspended(Summary, { props: base })
    expect(links(w)).toEqual([['Voltar para Hoje', '/hoje']])
  })
})
