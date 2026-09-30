import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useApiAction } from '~/composables/useApiAction'
import { useToast } from '~/composables/useToast'
import { extractApiMessage } from '~/utils/apiErrors'

function httpError(status: number, data?: unknown) {
  return Object.assign(new Error(`HTTP ${status}`), { response: { status, _data: data }, data })
}

function clear() {
  const t = useToast()
  for (const item of [...t.state.items]) t.dismiss(item.id)
}

describe('extractApiMessage', () => {
  it('prefers the first validation error', () => {
    expect(extractApiMessage(httpError(422, { message: 'x', errors: { name: ['Nome curto.'] } }))).toBe('Nome curto.')
  })

  it('uses the server message when it is not technical', () => {
    expect(extractApiMessage(httpError(409, { message: 'Já existe.' }))).toBe('Já existe.')
  })

  it('falls back to the status default for technical messages', () => {
    expect(extractApiMessage(httpError(500, { message: 'SQLSTATE[42P01]' }))).toBe('Algo deu errado. Tente novamente em instantes.')
  })

  it('reports network failures as offline', () => {
    expect(extractApiMessage(new TypeError('Failed to fetch'))).toContain('Sem conexão')
  })
})

describe('useApiAction', () => {
  beforeEach(() => clear())

  it('returns the result and shows the success toast', async () => {
    const { run, pending } = useApiAction()
    const p = run(async () => 42, { success: 'Salvo' })
    expect(pending.value).toBe(true)
    await expect(p).resolves.toBe(42)
    expect(pending.value).toBe(false)
    expect(useToast().state.items[0]?.message).toBe('Salvo')
  })

  it('shows an error toast with the extracted message', async () => {
    const { run, error } = useApiAction()
    const res = await run(() => Promise.reject(httpError(422, { errors: { name: ['Nome curto.'] } })))
    expect(res).toBeUndefined()
    expect(error.value).toBeTruthy()
    expect(useToast().state.items[0]).toMatchObject({ message: 'Nome curto.', type: 'error' })
  })

  it('adds a retry action when requested', async () => {
    const retry = vi.fn()
    const { run } = useApiAction()
    await run(() => Promise.reject(httpError(500)), { retry })
    const t = useToast()
    const item = t.state.items[0]!
    expect(item.action?.label).toBe('Tentar de novo')
    t.runAction(item.id)
    expect(retry).toHaveBeenCalledOnce()
  })

  it('opts out of the toast with error:false', async () => {
    const { run, error } = useApiAction()
    await run(() => Promise.reject(httpError(500)), { error: false })
    expect(error.value).toBeTruthy()
    expect(useToast().state.items).toHaveLength(0)
  })

  it('silent only warns', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { run } = useApiAction()
    await run(() => Promise.reject(httpError(500)), { silent: true })
    expect(useToast().state.items).toHaveLength(0)
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('ignores 401 and 402 (handled by the plugin)', async () => {
    const { run } = useApiAction()
    await run(() => Promise.reject(httpError(401)))
    await run(() => Promise.reject(httpError(402)))
    expect(useToast().state.items).toHaveLength(0)
  })

  it('rethrows when asked', async () => {
    const { run } = useApiAction()
    await expect(run(() => Promise.reject(httpError(500)), { rethrow: true })).rejects.toThrow('HTTP 500')
  })
})
