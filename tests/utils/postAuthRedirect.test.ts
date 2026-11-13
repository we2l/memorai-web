import { beforeEach, describe, expect, it, vi } from 'vitest'
import { postAuthRedirect } from '~/utils/postAuthRedirect'
import { EDITAL_INTENT_KEY, pendingEditalIntent } from '~/utils/editalIntent'
import { clearEditalIntent, saveEditalIntent } from '~/utils/publicEdital'
import { GUEST_STORAGE_KEY } from '~/utils/guestProgress'

const ID = '01JD0000000000000000000ABC'
const NEW_USER = { onboarding_completed: false }
const OLD_USER = { onboarding_completed: true }

function finishedLote() {
  localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify({ v: 1, area: 'concurso', version: '2026-11-08', reviews: [{ index: 0, rating: 3, reviewed_at: '2026-11-13T10:00:00Z' }], done: true }))
}

describe('postAuthRedirect', () => {
  // Node 25 brings a localStorage of its own without methods: a Map stands in (as in guestProgress.test.ts)
  let store = new Map<string, string>()
  const stub = () => ({ getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v), removeItem: (k: string) => store.delete(k) })
  beforeEach(() => {
    store = new Map()
    vi.stubGlobal('localStorage', stub())
  })

  it('sem lote nem intenção: onboarding pendente vai a /comecar, senão o redirect seguro ou /hoje', () => {
    expect(postAuthRedirect(NEW_USER)).toBe('/comecar')
    expect(postAuthRedirect(OLD_USER)).toBe('/hoje')
    expect(postAuthRedirect(OLD_USER, '/cadernos')).toBe('/cadernos')
    expect(postAuthRedirect(OLD_USER, '//evil.com')).toBe('/hoje')
  })

  it('a intenção do edital vem antes do /comecar e do redirect, e abre a leitura para aplicar', () => {
    saveEditalIntent(ID)
    expect(postAuthRedirect(NEW_USER)).toBe(`/ferramentas/edital-verticalizado/r/${ID}?aplicar=1`)
    expect(postAuthRedirect(OLD_USER, '/cadernos')).toBe(`/ferramentas/edital-verticalizado/r/${ID}?aplicar=1`)
  })

  it('o lote do visitante vence a intenção, que continua guardada para depois', () => {
    saveEditalIntent(ID)
    finishedLote()
    expect(postAuthRedirect(NEW_USER)).toBe('/comecar/pronto')
    expect(pendingEditalIntent()).toBe(ID)
  })

  it('sem usuário não há desvio; intenção inválida é ignorada', () => {
    saveEditalIntent(ID)
    expect(postAuthRedirect(null)).toBe('/hoje')
    localStorage.setItem(EDITAL_INTENT_KEY, '../../x')
    expect(pendingEditalIntent()).toBeNull()
    expect(postAuthRedirect(OLD_USER)).toBe('/hoje')
  })

  it('limpar a intenção volta ao caminho de sempre', () => {
    saveEditalIntent(ID)
    clearEditalIntent()
    expect(postAuthRedirect(NEW_USER)).toBe('/comecar')
  })
})
