import { describe, expect, it } from 'vitest'
import { fieldErrors, loginErrorMessage, passwordHint, retryAfterSeconds, waitLabel } from '~/utils/authMessages'

const httpError = (status: number, headers: Record<string, string> = {}, data?: unknown) => ({
  statusCode: status,
  response: { status, headers: new Headers(headers) },
  data,
})

describe('authMessages (prd-4g-conta-onboarding-v3 RF-F12..F14)', () => {
  it('login: credenciais erradas nunca dizem qual campo errou', () => {
    expect(loginErrorMessage(httpError(422, {}, { errors: { email: ['Credenciais inválidas'] } }))).toBe('E-mail ou senha incorretos.')
  })

  it('login: throttle com o tempo do Retry-After, e 1 minuto quando o header não vem', () => {
    expect(loginErrorMessage(httpError(429, { 'retry-after': '42' }))).toBe('Muitas tentativas. Tente de novo em 42 segundos.')
    expect(loginErrorMessage(httpError(429, { 'retry-after': '120' }))).toBe('Muitas tentativas. Tente de novo em 2 minutos.')
    expect(loginErrorMessage(httpError(429))).toBe('Muitas tentativas. Tente de novo em 1 minuto.')
  })

  it('login: conta em exclusão mostra o que a API diz, não "tente de novo" para sempre', () => {
    expect(loginErrorMessage(httpError(403, {}, { message: 'Sua conta está em exclusão.' }))).toBe('Sua conta está em exclusão.')
    expect(loginErrorMessage(httpError(403))).toBe('Esta conta não pode entrar agora.')
  })

  it('login: erro de rede ou 500 não vira texto técnico', () => {
    expect(loginErrorMessage(httpError(500))).toBe('Não foi possível entrar agora. Tente de novo.')
    expect(loginErrorMessage(new Error('Failed to fetch'))).toBe('Não foi possível entrar agora. Tente de novo.')
  })

  it('retryAfterSeconds ignora valor que não é número', () => {
    expect(retryAfterSeconds(httpError(429, { 'retry-after': 'Wed, 21 Oct 2026' }))).toBeNull()
    expect(retryAfterSeconds({})).toBeNull()
    expect(waitLabel(1)).toBe('1 segundo')
    expect(waitLabel(60)).toBe('1 minuto')
  })

  it('fieldErrors pega a 1ª mensagem de cada campo', () => {
    expect(fieldErrors({ data: { errors: { email: ['a', 'b'], password: ['c'] } } })).toEqual({ email: 'a', password: 'c' })
    expect(fieldErrors({})).toEqual({})
  })

  it('a dica de força é texto e acompanha a senha', () => {
    expect(passwordHint('')).toBe('Pelo menos 8 caracteres.')
    expect(passwordHint('abc')).toBe('Faltam 5 caracteres.')
    expect(passwordHint('abcdefg')).toBe('Falta 1 caractere.')
    expect(passwordHint('abcdefgh')).toBe('Senha fraca: misture letras e números.')
    expect(passwordHint('abcdefg1')).toBe('Senha boa. Mais longa fica ainda mais segura.')
    expect(passwordHint('abcdefgh1234')).toBe('Senha forte.')
  })
})
