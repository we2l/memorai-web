import { describe, expect, it } from 'vitest'
import { hasProAccess, opensTrialOnUse, opensTrialRequest, proPlanName, trialDaysLeft, trialEnded, trialEndsLine, trialInvite, PRO_NAME_FALLBACK } from '~/utils/trial'
import type { PlanCatalog, User } from '~/types'

const user = (over: Partial<User>): User => ({ id: 'u', name: 'Ana', email: 'a@b.c', email_verified: true, plan: 'free', default_learning_mode: 'general', onboarding_completed: true, ...over })

describe('proPlanName', () => {
  it('o nome do plano pago vem do catálogo; sem ele, "Intensivo"', () => {
    expect(proPlanName({ plans: [{ key: 'pro', name: 'Pro' }] } as unknown as PlanCatalog)).toBe('Pro')
    expect(proPlanName(null)).toBe(PRO_NAME_FALLBACK)
    expect(PRO_NAME_FALLBACK).toBe('Intensivo')
  })
})

describe('trialEndsLine (prd-planos-lancamento RF-F1)', () => {
  // 12/11 13:00 UTC = 10:00 em Brasília
  const endsAt = '2026-11-12T13:00:00Z'

  it('"Intensivo grátis até 12/11" antes dos dois últimos dias', () => {
    expect(trialEndsLine('Intensivo', endsAt, new Date('2026-11-05T13:00:00Z'))).toBe('Intensivo grátis até 12/11')
    expect(trialDaysLeft(endsAt, new Date('2026-11-05T13:00:00Z'))).toBe(7)
  })

  it('pelo dia de Brasília: "acaba amanhã" e "acaba hoje"', () => {
    // 11/11 23:30 em Brasília (12/11 02:30 UTC) ainda é véspera
    expect(trialEndsLine('Intensivo', endsAt, new Date('2026-11-12T02:30:00Z'))).toBe('Seu Intensivo grátis acaba amanhã')
    expect(trialEndsLine('Intensivo', endsAt, new Date('2026-11-12T03:30:00Z'))).toBe('Seu Intensivo grátis acaba hoje')
    expect(trialEndsLine('Pro', endsAt, new Date('2026-11-12T12:00:00Z'))).toBe('Seu Pro grátis acaba hoje')
  })
})

describe('estado do teste no /me', () => {
  it('teste ativo tem os gates do plano pago; o disponível só abre no uso com e-mail confirmado', () => {
    expect(hasProAccess(user({ trial: { status: 'active', started_at: null, ends_at: null } }))).toBe(true)
    expect(hasProAccess(user({ plan: 'pro' }))).toBe(true)
    expect(hasProAccess(user({ trial: { status: 'available', started_at: null, ends_at: null } }))).toBe(false)
    expect(opensTrialOnUse(user({ trial: { status: 'available', started_at: null, ends_at: null } }))).toBe(true)
    expect(opensTrialOnUse(user({ email_verified: false, trial: { status: 'available', started_at: null, ends_at: null } }))).toBe(false)
    expect(opensTrialOnUse(user({}))).toBe(false)
  })

  it('"acabou" só quando o teste rodou (used com started_at)', () => {
    expect(trialEnded(user({ trial: { status: 'used', started_at: '2026-10-01T00:00:00Z', ends_at: '2026-10-08T00:00:00Z' } }))).toBe(true)
    expect(trialEnded(user({ trial: { status: 'used', started_at: null, ends_at: null } }))).toBe(false)
    expect(trialEnded(user({ plan: 'pro', trial: { status: 'used', started_at: '2026-10-01T00:00:00Z', ends_at: null } }))).toBe(false)
  })

  it('o convite usa os dias que vierem', () => {
    expect(trialInvite('Intensivo', 7)).toBe('Mande seu primeiro material e ganhe 7 dias do Intensivo')
  })
})

describe('opensTrialRequest', () => {
  it('o 1º material e as ações de IA; nunca a revisão nem leituras', () => {
    expect(opensTrialRequest('POST', '/topics/t1/notes')).toBe(true)
    expect(opensTrialRequest('POST', '/ai/generate-cards')).toBe(true)
    expect(opensTrialRequest('POST', 'http://localhost:8037/api/chat')).toBe(true)
    expect(opensTrialRequest('POST', '/quizzes')).toBe(true)
    expect(opensTrialRequest('POST', '/notes/n1/mindmap/generate')).toBe(true)
    expect(opensTrialRequest('POST', '/topics/t1/notes/n1/improve')).toBe(true)
    expect(opensTrialRequest('POST', '/documents/d1/generate-note')).toBe(true)
    expect(opensTrialRequest('POST', '/review')).toBe(false)
    expect(opensTrialRequest('POST', '/notes/n1/opened')).toBe(false)
    expect(opensTrialRequest('GET', '/topics/t1/notes')).toBe(false)
    expect(opensTrialRequest(undefined, '/chat')).toBe(false)
  })
})
