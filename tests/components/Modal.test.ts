import { describe, it, expect, afterEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { defineComponent, h, nextTick, ref } from 'vue'
import Modal from '~/components/ui/Modal.vue'
import { scrollLockCount } from '~/composables/useScrollLock'

const tick = async () => { await nextTick(); await nextTick(); await new Promise(r => setTimeout(r, 0)) }

function host(opts: { nested?: boolean } = {}) {
  return defineComponent({
    setup() {
      const open = ref(false)
      const inner = ref(false)
      return { open, inner }
    },
    render() {
      return h('div', [
        h('button', { id: 'opener', onClick: () => { this.open = true } }, 'abrir'),
        h(Modal, { 'modelValue': this.open, 'onUpdate:modelValue': (v: boolean) => { this.open = v } }, () => [
          h('h2', 'Título do modal'),
          h('button', { id: 'first' }, 'primeiro'),
          h('button', { id: 'last', onClick: () => { this.inner = true } }, 'último'),
          opts.nested
            ? h(Modal, { 'modelValue': this.inner, 'onUpdate:modelValue': (v: boolean) => { this.inner = v } }, () => [h('h2', 'Interno'), h('button', { id: 'inner-btn' }, 'x')])
            : null,
        ]),
      ])
    },
  })
}

function press(key: string, shift = false) {
  document.dispatchEvent(new KeyboardEvent('keydown', { key, shiftKey: shift, bubbles: true, cancelable: true }))
}

describe('UiModal', () => {
  afterEach(() => { document.body.innerHTML = '' })

  it('aria-modal, rotulado pelo h2, foco inicial e retorno de foco', async () => {
    const wrapper = await mountSuspended(host(), { attachTo: document.body })
    const opener = document.getElementById('opener') as HTMLButtonElement
    opener.focus()
    opener.click()
    await tick()
    const dialog = document.querySelector('[role="dialog"]') as HTMLElement
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    const labelId = dialog.getAttribute('aria-labelledby')!
    expect(document.getElementById(labelId)?.textContent).toBe('Título do modal')
    expect(document.activeElement?.id).toBe('first')
    expect(scrollLockCount()).toBe(1)

    press('Escape')
    await tick()
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(document.activeElement).toBe(opener)
    expect(scrollLockCount()).toBe(0)
    wrapper.unmount()
  })

  it('prende o Tab dentro do modal', async () => {
    const wrapper = await mountSuspended(host(), { attachTo: document.body })
    ;(document.getElementById('opener') as HTMLButtonElement).click()
    await tick()
    ;(document.getElementById('last') as HTMLButtonElement).focus()
    press('Tab')
    // Wraps to the first focusable (the close button is first in DOM order)
    expect(['first'].includes(document.activeElement?.id ?? '') || document.activeElement?.getAttribute('aria-label') === 'Fechar').toBe(true)
    wrapper.unmount()
  })

  it('Esc fecha só o modal do topo', async () => {
    const wrapper = await mountSuspended(host({ nested: true }), { attachTo: document.body })
    ;(document.getElementById('opener') as HTMLButtonElement).click()
    await tick()
    ;(document.getElementById('last') as HTMLButtonElement).click()
    await tick()
    expect(document.querySelectorAll('[role="dialog"]').length).toBe(2)
    press('Escape')
    await tick()
    expect(document.querySelectorAll('[role="dialog"]').length).toBe(1)
    expect(scrollLockCount()).toBe(1)
    wrapper.unmount()
  })
})
