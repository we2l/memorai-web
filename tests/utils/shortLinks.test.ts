import { describe, it, expect } from 'vitest'
import { existsSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { SHORT_LINKS, shortLinkRules, videoShortLinks, VIDEO_FIRST, VIDEO_LAST } from '~/utils/shortLinks'
import { touchFromUrl } from '~/utils/firstTouch'
import { isPublicRoute } from '~/utils/routes'

describe('atalhos das redes (/tiktok, /yt, /ig, /edital)', () => {
  it('redirecionam com 302 (os perfis para /comecar, /edital para a ferramenta)', () => {
    expect(shortLinkRules()).toEqual({
      '/tiktok': { redirect: { to: '/comecar?utm_source=tiktok&utm_medium=social&utm_campaign=perfil', statusCode: 302 } },
      '/yt': { redirect: { to: '/comecar?utm_source=youtube&utm_medium=social&utm_campaign=perfil', statusCode: 302 } },
      '/ig': { redirect: { to: '/comecar?utm_source=instagram&utm_medium=bio', statusCode: 302 } },
      '/edital': { redirect: { to: '/ferramentas/edital-verticalizado?utm_source=youtube&utm_campaign=video', statusCode: 302 } },
    })
  })

  it.each(Object.entries(SHORT_LINKS).filter(([from]) => !/^\/(yt|tk)\d+$/.test(from)))('%s chega ao primeiro toque com a campanha inteira', (from, to) => {
    const touch = touchFromUrl(`https://baigi.com.br${to}`)
    const expected = {
      '/tiktok': { utm_source: 'tiktok', utm_medium: 'social', utm_campaign: 'perfil' },
      '/yt': { utm_source: 'youtube', utm_medium: 'social', utm_campaign: 'perfil' },
      '/ig': { utm_source: 'instagram', utm_medium: 'bio' },
      '/edital': { utm_source: 'youtube', utm_campaign: 'video' },
    }[from]
    const landing = from === '/edital' ? '/ferramentas/edital-verticalizado' : '/comecar'
    expect(touch).toEqual({ ...expected, landing, at: expect.any(String) })
    // The destination opens without an account
    expect(isPublicRoute(new URL(to, 'https://baigi.com.br').pathname)).toBe(true)
  })

  it.each(Object.keys(SHORT_LINKS))('%s não é página do app', (from) => {
    const pages = resolve(__dirname, '../../app/pages')
    expect(existsSync(`${pages}${from}.vue`)).toBe(false)
    expect(existsSync(`${pages}${from}`)).toBe(false)
  })
})

describe('atalhos por vídeo (/ytN e /tkN, de 27 a 199)', () => {
  const videoLinks = Object.entries(SHORT_LINKS).filter(([from]) => /^\/(yt|tk)\d+$/.test(from))

  it('gera 173 atalhos por canal, de 27 a 199, sem /yt26 nem /yt200', () => {
    expect(VIDEO_FIRST).toBe(27)
    expect(VIDEO_LAST).toBe(199)
    expect(videoLinks).toHaveLength(2 * 173)
    for (const prefix of ['yt', 'tk']) {
      expect(SHORT_LINKS[`/${prefix}27`]).toBeDefined()
      expect(SHORT_LINKS[`/${prefix}199`]).toBeDefined()
      expect(SHORT_LINKS[`/${prefix}26`]).toBeUndefined()
      expect(SHORT_LINKS[`/${prefix}0`]).toBeUndefined()
      expect(SHORT_LINKS[`/${prefix}200`]).toBeUndefined()
    }
  })

  it('/yt27 e /tk199 apontam para /comecar com utm_content de 3 dígitos', () => {
    expect(SHORT_LINKS['/yt27']).toBe('/comecar?utm_source=youtube&utm_medium=social&utm_campaign=video&utm_content=v027')
    expect(SHORT_LINKS['/tk199']).toBe('/comecar?utm_source=tiktok&utm_medium=social&utm_campaign=video&utm_content=v199')
    expect(videoShortLinks()['/yt27']).toBe(SHORT_LINKS['/yt27'])
  })

  it('ficam fora dos routeRules (entrariam no roteador do cliente e estourariam o budget); o middleware os atende', () => {
    const rules = shortLinkRules()
    expect(Object.keys(rules).sort()).toEqual(['/edital', '/ig', '/tiktok', '/yt'])
    expect(rules['/yt27']).toBeUndefined()
  })

  it.each(videoLinks)('%s grava canal, campanha e peça no primeiro toque', (from, to) => {
    const [, prefix, n] = from.match(/^\/(yt|tk)(\d+)$/)!
    const touch = touchFromUrl(`https://baigi.com.br${to}`)
    expect(touch).toEqual({
      utm_source: prefix === 'yt' ? 'youtube' : 'tiktok',
      utm_medium: 'social',
      utm_campaign: 'video',
      utm_content: `v${n.padStart(3, '0')}`,
      landing: '/comecar',
      at: expect.any(String),
    })
    expect(to).toMatch(/utm_content=v\d{3}$/)
  })

  it('não colide com página do app nem com rota dinâmica de primeiro nível', () => {
    const pages = resolve(__dirname, '../../app/pages')
    for (const [from] of videoLinks) {
      expect(existsSync(`${pages}${from}.vue`), from).toBe(false)
      expect(existsSync(`${pages}${from}`), from).toBe(false)
    }
    const dynamicTop = readdirSync(pages).filter(f => f.startsWith('['))
    expect(dynamicTop, 'rota dinâmica de primeiro nível poderia ser coberta pelos atalhos').toEqual([])
  })
})
