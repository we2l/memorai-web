import { afterEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import { Pencil } from 'lucide-vue-next'
import Dialog from '~/components/ui/Dialog.vue'
import Sheet from '~/components/ui/Sheet.vue'
import Menu from '~/components/ui/Menu.vue'
import { scrollLockCount } from '~/composables/useScrollLock'
import { axeViolations } from './axe'

enableAutoUnmount(afterEach)
afterEach(() => { document.body.innerHTML = '' })

const tick = async () => { await nextTick(); await nextTick(); await new Promise(r => setTimeout(r, 0)) }
const press = (key: string, target: EventTarget = document) =>
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))

/** Opener button + an overlay component bound with v-model. */
function host(component: object, props: Record<string, unknown> = {}, slots: Record<string, () => unknown> = {}) {
  return defineComponent({
    setup() {
      const open = ref(false)
      return () => h('div', [
        h('button', { id: 'opener', onClick: () => { open.value = true } }, 'abrir'),
        h(component, { ...props, 'modelValue': open.value, 'onUpdate:modelValue': (v: boolean) => { open.value = v } }, {
          default: () => [h('p', 'Corpo'), h('button', { id: 'first' }, 'primeiro')],
          ...slots,
        }),
      ])
    },
  })
}

async function openFrom(wrapperHost: object) {
  const w = await mountSuspended(wrapperHost, { attachTo: document.body })
  const opener = document.getElementById('opener') as HTMLButtonElement
  opener.focus()
  opener.click()
  await tick()
  return { w, opener }
}

describe('UiDialog', () => {
  it('modal rotulado e descrito, foco no primeiro campo, Esc fecha e devolve o foco', async () => {
    const { opener } = await openFrom(host(Dialog, { title: 'Excluir caderno', description: 'Não dá para desfazer.' }))
    const dialog = document.querySelector('[role="dialog"]') as HTMLElement
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(document.getElementById(dialog.getAttribute('aria-labelledby')!)?.textContent).toBe('Excluir caderno')
    expect(document.getElementById(dialog.getAttribute('aria-describedby')!)?.textContent).toBe('Não dá para desfazer.')
    // The close button (data-modal-close) is skipped by the initial focus
    expect(document.activeElement?.id).toBe('first')
    expect(scrollLockCount()).toBe(1)
    expect(await axeViolations(dialog)).toEqual([])

    press('Escape')
    await tick()
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(document.activeElement).toBe(opener)
    expect(scrollLockCount()).toBe(0)
  })

  it('fecha pelo botão Fechar e pelo fundo; rodapé recebe close', async () => {
    await openFrom(host(Dialog, { title: 'Título' }, { footer: () => h('button', { id: 'ok' }, 'Ok') }))
    expect(document.getElementById('ok')).not.toBeNull()
    ;(document.querySelector('[aria-label="Fechar"]') as HTMLButtonElement).click()
    await tick()
    expect(document.querySelector('[role="dialog"]')).toBeNull()

    ;(document.getElementById('opener') as HTMLButtonElement).click()
    await tick()
    const scrim = document.querySelector('[role="dialog"]')!.parentElement!
    scrim.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await tick()
    expect(document.querySelector('[role="dialog"]')).toBeNull()
  })

  it('dismissible=false: sem Fechar, Esc e fundo não fecham', async () => {
    await openFrom(host(Dialog, { title: 'Escolha', dismissible: false, role: 'alertdialog' }))
    expect(document.querySelector('[aria-label="Fechar"]')).toBeNull()
    press('Escape')
    document.querySelector('[role="alertdialog"]')!.parentElement!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await tick()
    expect(document.querySelector('[role="alertdialog"]')).not.toBeNull()
  })

  it('prende o Tab dentro do painel', async () => {
    await openFrom(host(Dialog, { title: 'Título' }))
    const close = document.querySelector('[aria-label="Fechar"]') as HTMLElement
    ;(document.getElementById('first') as HTMLElement).focus()
    press('Tab')
    expect(document.activeElement).toBe(close)
  })

  it('Esc só fecha o do topo, a rolagem segue travada até fechar o último e o de baixo volta ao foco', async () => {
    const Nested = defineComponent({
      setup() {
        const outer = ref(true)
        const inner = ref(true)
        return () => h(Dialog, { 'title': 'Fora', 'modelValue': outer.value, 'onUpdate:modelValue': (v: boolean) => { outer.value = v } }, () => [
          h(Dialog, { 'title': 'Dentro', 'modelValue': inner.value, 'onUpdate:modelValue': (v: boolean) => { inner.value = v } }),
        ])
      },
    })
    await mountSuspended(Nested, { attachTo: document.body })
    await tick()
    expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(2)
    expect(scrollLockCount()).toBe(2)
    press('Escape')
    await tick()
    expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(1)
    expect(document.querySelector('[role="dialog"]')!.textContent).toContain('Fora')
    expect(scrollLockCount()).toBe(1)
    press('Escape')
    await tick()
    expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(0)
    expect(scrollLockCount()).toBe(0)
  })
})

describe('UiSheet', () => {
  it.each([
    ['bottom', 'rounded-t-sheet', 'pb-safe-bottom'],
    ['right', 'h-full', 'sm:max-w-md'],
  ] as const)('lado %s: mesmo contrato do diálogo', async (side, a, b) => {
    const { opener } = await openFrom(host(Sheet, { title: 'Gerar podcast', side }))
    const sheet = document.querySelector('[role="dialog"]') as HTMLElement
    expect(sheet.classList.contains(a) && sheet.classList.contains(b)).toBe(true)
    expect(document.getElementById(sheet.getAttribute('aria-labelledby')!)?.textContent).toBe('Gerar podcast')
    expect(document.activeElement?.id).toBe('first')
    press('Escape')
    await tick()
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(document.activeElement).toBe(opener)
  })
})

describe('UiMenu', () => {
  const onEdit = vi.fn()
  const onDelete = vi.fn()
  const items = [
    { label: 'Renomear', icon: Pencil, onSelect: onEdit },
    { label: 'Mover', meta: 'Ctrl M', disabled: true },
    { label: 'Abrir', to: '/cadernos' },
    { label: 'Excluir', tone: 'danger' as const, onSelect: onDelete },
  ]

  async function mountMenu() {
    const w = await mountSuspended(Menu, { props: { items, label: 'Ações do caderno' }, attachTo: document.body })
    return { w, trigger: w.get('button[aria-haspopup="menu"]') }
  }

  it('botão de menu: aria-haspopup/expanded/controls e itens com role', async () => {
    const { w, trigger } = await mountMenu()
    expect(trigger.attributes('aria-label')).toBe('Ações do caderno')
    expect(trigger.attributes('aria-expanded')).toBe('false')
    await trigger.trigger('click')
    await tick()
    const menu = w.get('[role="menu"]')
    expect(trigger.attributes('aria-expanded')).toBe('true')
    expect(trigger.attributes('aria-controls')).toBe(menu.attributes('id'))
    expect(menu.attributes('aria-labelledby')).toBe(trigger.attributes('id'))
    const entries = menu.findAll('[role="menuitem"]')
    expect(entries.map(e => e.text())).toEqual(['Renomear', 'MoverCtrl M', 'Abrir', 'Excluir'])
    expect(entries[1]!.attributes('aria-disabled')).toBe('true')
    expect(entries[2]!.attributes('href')).toBe('/cadernos')
    expect(entries[3]!.classes()).toContain('text-danger')
    expect(document.activeElement).toBe(entries[0]!.element)
    expect(await axeViolations(w.element)).toEqual([])
  })

  it('teclado: setas pulam o desabilitado e dão a volta, Home/End, letra, Esc devolve o foco', async () => {
    const { w, trigger } = await mountMenu()
    await trigger.trigger('keydown', { key: 'ArrowDown' })
    await tick()
    const menu = w.get('[role="menu"]').element
    const label = () => document.activeElement?.textContent?.trim()
    expect(label()).toBe('Renomear')
    press('ArrowDown', document.activeElement!)
    expect(label()).toBe('Abrir')
    press('ArrowDown', document.activeElement!)
    press('ArrowDown', document.activeElement!)
    expect(label()).toBe('Renomear')
    press('ArrowUp', document.activeElement!)
    expect(label()).toBe('Excluir')
    press('Home', document.activeElement!)
    expect(label()).toBe('Renomear')
    press('End', document.activeElement!)
    expect(label()).toBe('Excluir')
    press('a', document.activeElement!)
    expect(label()).toBe('Abrir')
    press('Escape', menu.querySelector('[role="menuitem"]')!)
    await tick()
    expect(w.find('[role="menu"]').exists()).toBe(false)
    expect(document.activeElement).toBe(trigger.element)
  })

  it('ArrowUp no gatilho abre no último; escolher chama onSelect e fecha; desabilitado não', async () => {
    const { w, trigger } = await mountMenu()
    await trigger.trigger('keydown', { key: 'ArrowUp' })
    await tick()
    expect(document.activeElement?.textContent?.trim()).toBe('Excluir')
    await w.findAll('[role="menuitem"]')[1]!.trigger('click')
    expect(w.find('[role="menu"]').exists()).toBe(true)
    await w.findAll('[role="menuitem"]')[3]!.trigger('click')
    expect(onDelete).toHaveBeenCalledOnce()
    expect(w.find('[role="menu"]').exists()).toBe(false)
  })

  it('clique fora fecha; align start; gatilho próprio pelo slot', async () => {
    const w = await mountSuspended(Menu, {
      props: { items, align: 'start' },
      slots: { trigger: ({ props }: { props: Record<string, unknown> }) => h('button', { ...props, class: 'meu' }, 'Opções') },
      attachTo: document.body,
    })
    const trigger = w.get('button.meu')
    expect(trigger.attributes('aria-haspopup')).toBe('menu')
    await trigger.trigger('click')
    await tick()
    expect(w.get('[data-menu-panel]').classes()).toContain('left-0')
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    await tick()
    expect(w.find('[role="menu"]').exists()).toBe(false)
  })

  it('cabeçalho fora do role=menu, separador e grupo de rádio (Aparência)', async () => {
    const pick = vi.fn()
    const w = await mountSuspended(Menu, {
      props: {
        label: 'Conta',
        items: [
          { label: 'Conta e segurança', to: '/configuracoes#seguranca' },
          { label: 'Sistema', group: 'Aparência', checked: true, onSelect: pick },
          { label: 'Claro', group: 'Aparência', checked: false, onSelect: pick },
          { label: 'Sair', separator: true, tone: 'danger' as const },
        ],
      },
      slots: { header: () => h('p', { id: 'quem' }, 'Rafael') },
      attachTo: document.body,
    })
    await w.get('button[aria-haspopup="menu"]').trigger('click')
    await tick()
    const menu = w.get('[role="menu"]')
    expect(menu.find('#quem').exists()).toBe(false)
    expect(w.get('[data-menu-panel]').find('#quem').exists()).toBe(true)
    const group = menu.get('[role="group"]')
    expect(document.getElementById(group.attributes('aria-labelledby')!)?.textContent).toBe('Aparência')
    const radios = group.findAll('[role="menuitemradio"]')
    expect(radios.map(r => r.attributes('aria-checked'))).toEqual(['true', 'false'])
    expect(menu.findAll('[role="separator"]')).toHaveLength(1)
    // Arrows walk across the group like any item
    const label = () => document.activeElement?.textContent?.trim()
    expect(label()).toBe('Conta e segurança')
    press('ArrowDown', document.activeElement!)
    expect(label()).toBe('Sistema')
    press('End', document.activeElement!)
    expect(label()).toBe('Sair')
    expect(await axeViolations(w.element)).toEqual([])
    await radios[1]!.trigger('click')
    expect(pick).toHaveBeenCalledOnce()
  })
})
