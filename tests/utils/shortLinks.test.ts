import { describe, it, expect } from 'vitest'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { SHORT_LINKS, shortLinkRules } from '~/utils/shortLinks'
import { touchFromUrl } from '~/utils/firstTouch'
import { isPublicRoute } from '~/utils/routes'

describe('atalhos das redes (/tiktok, /yt)', () => {
  it('redirecionam com 302 para /comecar', () => {
    expect(shortLinkRules()).toEqual({
      '/tiktok': { redirect: { to: '/comecar?utm_source=tiktok&utm_medium=social&utm_campaign=perfil', statusCode: 302 } },
      '/yt': { redirect: { to: '/comecar?utm_source=youtube&utm_medium=social&utm_campaign=perfil', statusCode: 302 } },
    })
  })

  it.each(Object.entries(SHORT_LINKS))('%s chega ao primeiro toque com a campanha inteira', (from, to) => {
    const touch = touchFromUrl(`https://baigi.com.br${to}`)
    expect(touch).toMatchObject({ utm_medium: 'social', utm_campaign: 'perfil', landing: '/comecar' })
    expect(touch?.utm_source).toBe(from === '/tiktok' ? 'tiktok' : 'youtube')
    // The destination opens without an account
    expect(isPublicRoute(new URL(to, 'https://baigi.com.br').pathname)).toBe(true)
  })

  it.each(Object.keys(SHORT_LINKS))('%s não é página do app', (from) => {
    const pages = resolve(__dirname, '../../app/pages')
    expect(existsSync(`${pages}${from}.vue`)).toBe(false)
    expect(existsSync(`${pages}${from}`)).toBe(false)
  })
})
