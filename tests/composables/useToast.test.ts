import { describe, it, expect } from 'vitest'
import { useToast } from '~/composables/useToast'

describe('useToast', () => {
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
})
