import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { test } from '@playwright/test'

/**
 * Share card of the landing (og:image, 1200×630): the first fold of the landing D itself, not a drawn image. The
 * page is rendered at 1200×630 (DPR 2) with a CSS of this capture only: the header keeps just the logo, the lead,
 * the calls and the cookie banner go away, the title grows to read in the ~500 px thumbnail of WhatsApp/Facebook,
 * and the phone and the dolphin shrink to fit whole. Opaque (JPEG on the page's background): the transparent
 * mascot of the page alone turned black when Facebook cropped it.
 *
 * Needs only the web build (no API, no login):
 *   NUXT_PUBLIC_API_BASE=http://localhost:8037/api npm run build && PORT=3000 node .output/server/index.mjs
 *   npx playwright test -c e2e/landing/og.config.ts      (OG_BASE_URL=http://localhost:3100 for another port)
 */
const OUT = path.join(__dirname, '..', '..', 'public', 'landing', 'og-baigi.jpg')
const W = 1200
const H = 630

// Only for the capture: everything is the page's own markup and tokens, just framed for 1200×630
const FRAME = `
  .landing-page .lp-nav, .landing-page .lp-enter, .landing-page .lp-header-cta, .landing-page .lp-sticky,
  .landing-page .lp-hero .lp-lead, .landing-page .lp-hero-cta { display: none !important; }
  .landing-page .lp-header { position: absolute; inset: 0 0 auto; border: 0; background: transparent; backdrop-filter: none; }
  .landing-page .lp-header .lp-wrap { height: 92px; padding: 0 56px; max-width: none; }
  .landing-page .lp-logo { font-size: 30px; }
  .landing-page .lp-logo img { width: 46px; }
  .landing-page .lp-hero { min-height: 0; height: ${H}px; padding: 0; overflow: hidden; }
  .landing-page .lp-hero > .lp-wrap { max-width: none; height: 100%; padding: 0 56px; grid-template-columns: 1fr 470px; gap: 0; }
  .landing-page .lp-hero .lp-text { padding: 70px 0 0; }
  .landing-page .lp-hero .lp-h1 { font-size: 128px; }
  .landing-page .lp-tag { font-size: 30px; right: 10px; bottom: -48px; }
  .landing-page .lp-scene { height: ${H}px; margin: 0; }
  .landing-page .lp-scene .lp-phone { width: 236px; top: 40px; right: 20px; }
  .landing-page .lp-scene .lp-hero-m { width: 250px; left: -40px; bottom: 18px; }
  .landing-page .lp-scene .lp-bubble { left: -60px; top: 112px; font-size: 19px; max-width: 270px; --tail: 130px; }
  body > :not(#__nuxt), [data-testid="consent-banner"] { display: none !important; }
`

test.use({ viewport: { width: W, height: H }, deviceScaleFactor: 2, colorScheme: 'light', reducedMotion: 'reduce' })

test('imagem de compartilhamento da landing', async ({ page }) => {
  await page.goto(`${process.env.OG_BASE_URL ?? 'http://localhost:3000'}/`, { waitUntil: 'networkidle' })
  await page.addStyleTag({ content: FRAME })
  await page.evaluate(() => document.fonts.ready)
  // The hero's images on screen (poster of the clip, dolphin) loaded before the shot; the other `?m=` variants are hidden
  await page.waitForFunction(() => [...document.querySelectorAll<HTMLImageElement>('.lp-hero img')]
    .filter(i => i.checkVisibility())
    .every(i => i.complete && i.naturalWidth > 0))
  await page.waitForTimeout(400)
  const png = await page.screenshot({ clip: { x: 0, y: 0, width: W, height: H }, animations: 'disabled' })
  await sharp(png).resize(W, H).flatten({ background: '#fafafa' }).jpeg({ quality: 86, mozjpeg: true }).toFile(OUT)
  const kb = Math.round(fs.statSync(OUT).size / 1024)
  if (kb > 300) throw new Error(`og-baigi.jpg com ${kb} KB (teto ~300 KB)`)
})
