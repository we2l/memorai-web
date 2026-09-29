import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { nextTick } from 'vue'
import HubCardsTab from '~/components/topic/HubCardsTab.vue'

const { sanitizeSpy } = vi.hoisted(() => ({ sanitizeSpy: vi.fn((html: string) => html) }))
mockNuxtImport('useSanitize', () => () => ({ sanitize: sanitizeSpy }))

function makeCards(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    id: `c${i}`,
    front: `<p>Pergunta ${i}</p>`,
    back: `<p>Resposta ${i}</p>`,
    state: 'new',
    due: null,
    lapses: 0,
    source_note_id: null,
  }))
}

function mountTab(cards: any[]) {
  return mountSuspended(HubCardsTab, {
    props: {
      topicId: 't1',
      cards,
      generatedCards: [],
      aiGenerating: false,
      errorPatterns: null,
      noteNameById: () => '',
    },
  })
}

describe('HubCardsTab', () => {
  beforeEach(() => sanitizeSpy.mockClear())

  it('memoiza a sanitização: ≤ 500 chamadas após 3 re-renders com 500 cards', async () => {
    const cards = makeCards(500)
    const wrapper = await mountTab(cards)
    for (let i = 0; i < 3; i++) {
      await wrapper.setProps({ highlightId: `c${i}` })
      await nextTick()
    }
    expect(sanitizeSpy.mock.calls.length).toBeLessThanOrEqual(500)
    // Only the displayed page is sanitized (front + back of 20 cards)
    expect(sanitizeSpy.mock.calls.length).toBe(40)
  })

  it('busca em texto puro: não casa atributo HTML e casa o verso', async () => {
    const cards = [
      ...makeCards(11),
      { id: 'x1', front: '<span class="abc">Capital</span>', back: 'Lisboa', state: 'new', due: null, lapses: 0 },
      { id: 'x2', front: 'Rio', back: '<p>tem abc no verso</p>', state: 'new', due: null, lapses: 0 },
    ]
    const wrapper = await mountTab(cards)
    await wrapper.find('input[placeholder="Buscar card..."]').setValue('abc')
    const ids = wrapper.findAll('[id^="card-"]').map(el => el.attributes('id'))
    expect(ids).toEqual(['card-x2'])
  })
})
