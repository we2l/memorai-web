import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import TreeItem from '~/components/topic/TreeItem.vue'
import TreeItemMenu from '~/components/topic/TreeItemMenu.vue'
import type { Topic } from '~/types'

const topic = (id: string, name: string, children: Topic[] = [], parent: string | null = null): Topic => ({
  id, name, description: null, parent_id: parent, position: 0, color: 'purple', learning_mode: null,
  target_language: null, source_language: null, language_level: null, notes_count: 0,
  // Direct cards only (GET /topics): a caderno imported from Anki has 0 here
  flashcards_count: 0, children, created_at: '', updated_at: '',
})

async function openMenu(wrapper: Awaited<ReturnType<typeof mountSuspended>>, name: string) {
  await wrapper.get(`button[aria-label="Opções de ${name}"]`).trigger('click')
  return wrapper.get(`[role="menu"][aria-label="Opções de ${name}"]`).findAll('[role="menuitem"]').map(b => b.text())
}

describe('TreeItemMenu', () => {
  it('"Adicionar assunto" aparece só quando o nível permite (04/B7)', async () => {
    const yes = await mountSuspended(TreeItemMenu, { props: { name: 'X', canAddChild: true } })
    expect(await openMenu(yes, 'X')).toEqual(['Adicionar assunto', 'Editar', 'Excluir'])
    const no = await mountSuspended(TreeItemMenu, { props: { name: 'X', canAddChild: false } })
    expect(await openMenu(no, 'X')).toEqual(['Editar', 'Excluir'])
  })
})

describe('TreeItem', () => {
  const grandchild = topic('g', 'Atos', [], 'c')
  const child = topic('c', 'Administrativo', [grandchild], 'r')
  const root = topic('r', 'Direito', [child])
  // /topics/progress: every number is of the subtree
  const progressMap = {
    r: { progress: 0.3, session_count: 603, flashcards_count: 5000 },
    c: { progress: 0.2, session_count: 155, flashcards_count: 1013 },
    g: { progress: 0.1, session_count: 63, flashcards_count: 346 },
  }

  it('caderno raiz sem cards diretos mostra os números da subárvore, sem misturar escopos', async () => {
    const wrapper = await mountSuspended(TreeItem, { props: { topic: root, depth: 0, progressMap } })
    expect(wrapper.text()).toContain('5000 cards')
    expect(wrapper.text()).toContain('603 pendentes')
    expect(wrapper.text()).not.toMatch(/(^|\D)0 cards/)
  })

  it('assunto até 2 níveis abaixo do caderno: o 3º nível não oferece "Adicionar assunto"', async () => {
    const wrapper = await mountSuspended(TreeItem, { props: { topic: root, depth: 0, progressMap, selectedId: 'g' } })
    expect(await openMenu(wrapper, 'Direito')).toContain('Adicionar assunto')
    expect(await openMenu(wrapper, 'Administrativo')).toContain('Adicionar assunto')
    expect(await openMenu(wrapper, 'Atos')).not.toContain('Adicionar assunto')
  })

  it('"Adicionar assunto" emite o pai', async () => {
    const wrapper = await mountSuspended(TreeItem, { props: { topic: root, depth: 0, progressMap } })
    await openMenu(wrapper, 'Direito')
    await wrapper.findAll('[role="menuitem"]')[0]!.trigger('click')
    expect(wrapper.emitted('add-child')?.[0]).toEqual(['r'])
  })
})
