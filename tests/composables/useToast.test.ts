import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { useToast, TOAST_MAX } from '~/composables/useToast'
import Toast from '~/components/ui/Toast.vue'

function clear() {
  const t = useToast()
  for (const item of [...t.state.items]) t.dismiss(item.id)
}

describe('useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    clear()
  })
  afterEach(() => {
    clear()
    vi.useRealTimers()
  })

  it('starts hidden', () => {
    const { state } = useToast()
    expect(state.visible).toBe(false)
  })

  it('shows toast with message and type', () => {
    const { state, show } = useToast()
    show('Sucesso!', 'success')
    expect(state.visible).toBe(true)
    expect(state.message).toBe('Sucesso!')
    expect(state.type).toBe('success')
  })

  it('defaults to success type', () => {
    const { state, show } = useToast()
    show('Mensagem')
    expect(state.type).toBe('success')
  })

  it('supports error type', () => {
    const { state, show } = useToast()
    show('Erro!', 'error')
    expect(state.type).toBe('error')
  })

  it('keeps at most 3 toasts, dropping the oldest', () => {
    const { state, show } = useToast()
    show('a'); show('b'); show('c'); show('d')
    expect(state.items).toHaveLength(TOAST_MAX)
    expect(state.items.map(i => i.message)).toEqual(['b', 'c', 'd'])
  })

  it('uses 3s for success and 6s for error', () => {
    const { state, show } = useToast()
    show('ok', 'success')
    show('falhou', 'error')
    vi.advanceTimersByTime(3100)
    expect(state.items.map(i => i.message)).toEqual(['falhou'])
    vi.advanceTimersByTime(3000)
    expect(state.items).toHaveLength(0)
  })

  it('accepts the legacy numeric duration', () => {
    const { state, show } = useToast()
    show('longo', 'info', 10_000)
    vi.advanceTimersByTime(9000)
    expect(state.items).toHaveLength(1)
  })

  it('runs the action and dismisses', () => {
    const { state, show, runAction } = useToast()
    const onClick = vi.fn()
    const id = show('Excluído', 'success', { action: { label: 'Desfazer', onClick } })
    runAction(id)
    expect(onClick).toHaveBeenCalledOnce()
    expect(state.items).toHaveLength(0)
  })

  it('pauses the countdown while hovered/focused', () => {
    const { state, show, pause, resume } = useToast()
    const id = show('Excluído', 'success', { duration: 2000, action: { label: 'Desfazer', onClick: () => {} } })
    pause(id)
    vi.advanceTimersByTime(10_000)
    expect(state.items).toHaveLength(1)
    resume(id)
    vi.advanceTimersByTime(2100)
    expect(state.items).toHaveLength(0)
  })
})

describe('UiToast', () => {
  beforeEach(() => clear())

  it('announces success politely and errors assertively', async () => {
    const { show } = useToast()
    show('Salvo', 'success')
    show('Falhou', 'error')
    await mountSuspended(Toast)
    const status = document.body.querySelector('[role="status"]')
    const alert = document.body.querySelector('[role="alert"]')
    expect(status?.getAttribute('aria-live')).toBe('polite')
    expect(status?.textContent).toContain('Salvo')
    expect(status?.textContent).not.toContain('Falhou')
    expect(alert?.textContent).toContain('Falhou')
    expect(document.body.querySelector('button[aria-label="Fechar aviso"]')).not.toBeNull()
  })
})
