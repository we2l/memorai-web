import { describe, it, expect } from 'vitest'
import { existsSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { SHORT_LINKS, shortLinkRules, videoShortLinks, VIDEO_FIRST, VIDEO_LAST, inAppNetwork, editalShortLink, serverShortLink } from '~/utils/shortLinks'
import { touchFromUrl } from '~/utils/firstTouch'
import { isPublicRoute } from '~/utils/routes'

describe('atalhos das redes (/tiktok, /yt, /ig, /edital)', () => {
  it('os perfis redirecionam com 302 na borda (o /edital fica no servidor, porque lê o navegador)', () => {
    expect(shortLinkRules()).toEqual({
      '/tiktok': { redirect: { to: '/comecar?utm_source=tiktok&utm_medium=social&utm_campaign=perfil', statusCode: 302 } },
      '/yt': { redirect: { to: '/comecar?utm_source=youtube&utm_medium=social&utm_campaign=perfil', statusCode: 302 } },
      '/ig': { redirect: { to: '/comecar?utm_source=instagram&utm_medium=bio', statusCode: 302 } },
    })
  })

  it.each(Object.entries(SHORT_LINKS).filter(([from]) => !/^\/(yt|tk)\d+$/.test(from)))('%s chega ao primeiro toque com a campanha inteira', (from, to) => {
    const touch = touchFromUrl(`https://baigi.com.br${to}`)
    const expected = {
      '/tiktok': { utm_source: 'tiktok', utm_medium: 'social', utm_campaign: 'perfil' },
      '/yt': { utm_source: 'youtube', utm_medium: 'social', utm_campaign: 'perfil' },
      '/ig': { utm_source: 'instagram', utm_medium: 'bio' },
      '/edital': { utm_source: 'youtube', utm_medium: 'social', utm_campaign: 'video' },
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
    expect(Object.keys(rules).sort()).toEqual(['/ig', '/tiktok', '/yt'])
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
      landing: /^\/(yt|tk)31$/.test(from) ? '/ferramentas/edital-verticalizado' : '/comecar',
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

describe('/edital e o V031: a rede de quem abriu', () => {
  const tiktok = 'Mozilla/5.0 (Linux; Android 12; moto g41 Build/S3RWS32; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/118.0.0.0 Mobile Safari/537.36 musical_ly_2023109030 JsSdk/1.0 NetType/WIFI Channel/googleplay AppName/musical_ly app_version/31.9.3 ByteLocale/es'
  const instagram = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 305.0.0.0 (iPhone14,5; iOS 17_0; pt_BR) FBAN/FBIOS'
  const facebook = 'Mozilla/5.0 (Linux; Android 13; SM-A135M) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/119.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/440.0.0.0;]'
  const chrome = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Mobile Safari/537.36'

  it('reconhece o navegador de dentro do TikTok, do Instagram e do Facebook', () => {
    expect(inAppNetwork(tiktok)).toBe('tiktok')
    expect(inAppNetwork(instagram)).toBe('instagram')
    expect(inAppNetwork(facebook)).toBe('facebook')
    expect(inAppNetwork(chrome)).toBeNull()
    expect(inAppNetwork(undefined)).toBeNull()
  })

  it('/edital marca a rede do navegador e, sem marca, continua youtube', () => {
    expect(editalShortLink(tiktok)).toBe('/ferramentas/edital-verticalizado?utm_source=tiktok&utm_medium=social&utm_campaign=video')
    expect(editalShortLink(facebook)).toContain('utm_source=facebook')
    expect(editalShortLink(chrome)).toBe('/ferramentas/edital-verticalizado?utm_source=youtube&utm_medium=social&utm_campaign=video')
    expect(serverShortLink('/edital', tiktok, videoShortLinks())).toBe(editalShortLink(tiktok))
  })

  it('/yt31 e /tk31 levam à ferramenta do edital com a peça; o resto segue para /comecar', () => {
    const links = videoShortLinks()
    expect(links['/yt31']).toBe('/ferramentas/edital-verticalizado?utm_source=youtube&utm_medium=social&utm_campaign=video&utm_content=v031')
    expect(links['/tk31']).toBe('/ferramentas/edital-verticalizado?utm_source=tiktok&utm_medium=social&utm_campaign=video&utm_content=v031')
    expect(links['/yt32']).toMatch(/^\/comecar\?/)
    expect(serverShortLink('/yt31', chrome, links)).toBe(links['/yt31'])
    expect(serverShortLink('/yt', chrome, links)).toBeNull()
    expect(serverShortLink('/comecar', chrome, links)).toBeNull()
  })
})
