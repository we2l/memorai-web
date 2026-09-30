#!/usr/bin/env node
// One-shot mascot conversion (prd-performance-frontend RF-06).
// Source PNGs were removed from app/assets after conversion (recover them from git
// history: `git show 03d84dc:app/assets/<name>.png`) and passed with --src; outputs WebP + AVIF at 2x the largest displayed width into app/assets/mascots/.
// Usage: npm run images -- --src <dir-with-original-pngs>
import { existsSync, mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import sharp from 'sharp'

// name → output width in px (2x the largest use in the app)
const TARGETS = {
  'mascot-baigi': 256, //            landing/HeroPipeline.vue sm:w-32 (128 px)
  'mascot-baigi-celebrating': 224, // pages/revisar.vue w-28 (112 px)
  'mascot-baigi-podcast': 224, //     pages/podcasts.vue w-28 (112 px)
  'mascot-baigi-thinking': 192, //    pages/simulados/index.vue, EmptyStateOnboarding w-24 (96 px)
  'mascot-baigi-reading': 64, //      home/HomeHero.vue 24 px
  'mascot-baigi-bust-64': 64, //      ui/Logo.vue, landing/LogoLanding.vue (22–36 px), HomeHero 24 px
}
const SOURCE_OF = { 'mascot-baigi-bust-64': 'mascot-baigi-bust' }

const args = process.argv.slice(2)
const srcIdx = args.indexOf('--src')
const srcDir = resolve(srcIdx >= 0 ? args[srcIdx + 1] : 'app/assets')
const outDir = resolve('app/assets/mascots')
mkdirSync(outDir, { recursive: true })

for (const [name, width] of Object.entries(TARGETS)) {
  const src = join(srcDir, `${SOURCE_OF[name] ?? name}.png`)
  if (!existsSync(src)) {
    console.warn(`pulando ${name}: ${src} não existe`)
    continue
  }
  const base = sharp(src).resize({ width, withoutEnlargement: true })
  const webp = await base.clone().webp({ quality: 80, effort: 6 }).toFile(join(outDir, `${name}.webp`))
  const avif = await base.clone().avif({ quality: 55, effort: 6 }).toFile(join(outDir, `${name}.avif`))
  console.log(`${name}: ${webp.width}x${webp.height} webp ${(webp.size / 1024).toFixed(1)} KB · avif ${(avif.size / 1024).toFixed(1)} KB`)
}
