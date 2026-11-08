import { readdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import { sentryVitePlugin } from '@sentry/vite-plugin'

// Source maps of the browser bundle go to Sentry only when the build has its credentials (Vercel env, optional):
// 'hidden' writes them without the sourceMappingURL comment, the plugin uploads and deletes them, and the
// nitro:build:public-assets hook below removes any .map left, so none is ever served.
const SENTRY_UPLOAD = !!(process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT)
const APP_VERSION = process.env.NUXT_PUBLIC_APP_VERSION || (process.env.VERCEL_GIT_COMMIT_SHA || '').slice(0, 7) || 'dev'

// CSP in Report-Only (RN-09 of prd-hardening-seguranca): promote to enforcing
// only after a week without legitimate violations.
const apiOrigin = process.env.NUXT_PUBLIC_API_ORIGIN
  || new URL(process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:8037/api').origin
const s3Origin = process.env.CSP_S3_ORIGIN || 'https://*.amazonaws.com'
// PostHog (ADR-024): same-origin /ingest proxy by default; the cloud hosts cover a direct
// NUXT_PUBLIC_POSTHOG_HOST and the SDK's assets (doc: connect-src/script-src *.posthog.com).
const posthogOrigins = 'https://*.posthog.com'
// Cloudflare Turnstile (sign-up, forgot password, resend verification): script + iframe from this origin
const turnstileOrigin = 'https://challenges.cloudflare.com'
// Sentry (errors only, after consent): events go to the ingest host of the DSN (*.ingest.sentry.io, EU or US)
const sentryOrigins = 'https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://*.ingest.de.sentry.io'
// Mercado Pago checkout transparente (ADR-034): MercadoPago.js, the card fields and the 3DS challenge in iframes. The MP
// publishes no domain list: start wide, read the Report-Only violations in the sandbox, then narrow.
const mercadoPagoOrigins = 'https://sdk.mercadopago.com https://*.mercadopago.com https://*.mercadolibre.com https://*.mercadolivre.com'
const mercadoPagoImages = 'https://*.mlstatic.com'

const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com ${posthogOrigins} ${turnstileOrigin} ${mercadoPagoOrigins}`,
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  `img-src 'self' data: blob: ${s3Origin} ${apiOrigin} https://lh3.googleusercontent.com ${mercadoPagoImages} ${mercadoPagoOrigins}`,
  `media-src 'self' blob: ${s3Origin} ${apiOrigin}`,
  `connect-src 'self' ${apiOrigin} ${s3Origin} ${posthogOrigins} ${turnstileOrigin} ${sentryOrigins} ${mercadoPagoOrigins}`,
  "worker-src 'self' blob: https://cdnjs.cloudflare.com",
  `frame-src 'self' blob: ${apiOrigin} ${s3Origin} ${turnstileOrigin} ${mercadoPagoOrigins}`,
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

// Logged-in hint (cookie baigi_logged_in) on a prerendered public page: hide it until the app decides. On `/` go
// straight to /hoje before the landing loads: the middleware's redirect during hydration rendered the app over the
// landing's HTML ("Hydration completed but contains mismatches"). A stale hint lands on /entrar via /hoje, and /me's
// 401 clears it; only `/`, so an API down never bounces /entrar and /hoje into a loop.
const SESSION_HINT_SCRIPT = `(function(){var d=document.documentElement,p=location.pathname.replace(/\\/$/,'')||'/';if(['/','/entrar','/criar-conta','/planos','/ajuda'].indexOf(p)<0)return;if(!/(?:^|;\\s*)baigi_logged_in=1/.test(document.cookie))return;d.classList.add('baigi-session');if(p==='/'){location.replace('/hoje');return}setTimeout(function(){d.classList.remove('baigi-session')},4000)})()`

// Page color of the DS v3 (--surface-page in app/assets/css/tokens.css, light and dark): the manifest and
// the theme-color metas need the literal. tests/scripts/pwaManifest.test.ts keeps both in sync with tokens.css.
const THEME_COLOR = { light: '#FFFFFF', dark: '#0F0D14' }

// Theme before the first paint (prd-ds-v3-fundacao RF-1.4): localStorage['color-mode'] is light | dark |
// system (missing = system, the key the E2E set). .dark goes on <html> and color-scheme inline paints the
// canvas dark even before the CSS arrives; "system" follows prefers-color-scheme and its changes. The
// theme-color metas follow the app theme (not only the OS) once parsed. composables/useColorMode.ts
// does the same at runtime.
const THEME_SCRIPT = `(function(){var d=document.documentElement,q=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)');function pref(){try{var v=localStorage.getItem('color-mode');return v==='light'||v==='dark'?v:'system'}catch(e){return 'system'}}function meta(){var dark=d.classList.contains('dark'),m=document.querySelectorAll('meta[name="theme-color"]');for(var i=0;i<m.length;i++){m[i].setAttribute('content',dark?'${THEME_COLOR.dark}':'${THEME_COLOR.light}');m[i].removeAttribute('media')}}function apply(){var p=pref(),dark=p==='dark'||(p==='system'&&!!q&&q.matches);d.classList.toggle('dark',dark);d.style.colorScheme=dark?'dark':'light';meta()}apply();document.addEventListener('DOMContentLoaded',meta);if(q){var f=function(){if(pref()==='system')apply()};if(q.addEventListener)q.addEventListener('change',f);else if(q.addListener)q.addListener(f)}})()`

// Public pages opened from study e-mails (prd-retencao-lembretes): online-only like
// termos/privacidade, so their chunks carry a prefix and stay out of the SW precache.
const EMAIL_PAGE_CHUNK = /\/pages\/(lembretes\/desativado|provas\/resultado)\.vue/
// posthog-js and the Sentry SDK are imported only after consent (prd-analytics-posthog RF-F05): never precached.
const ANALYTICS_CHUNK = /\/node_modules\/posthog-js\/|\/utils\/sentryClient\.ts/
// Consent banner/modal only matter online on a first visit: kept out of the precache too.
const CONSENT_CHUNK = /\/components\/ui\/Consent(Banner|Modal)\.vue/
// One-shot pages that only work online (onboarding, the auth screens, OAuth and checkout returns, reset link,
// the first batch's end; the organization of the 4b-2: trash, Anki, move and delete dialogs): fetched when opened
// instead of in every install download (precache budget, prd-correcoes-experiencia Q2, prd-4g-conta-onboarding-v3,
// prd-4b-caderno-v3 §10.2), and the landing (prd-landing-v4 RF-L14: marketing, online only). /ajuda stays: "?" opens
// the shortcuts offline too.
const ONE_SHOT_PAGE_CHUNK = /\/(pages\/(index|comecar(\/(index|pronto|\[area\]))?|entrar|criar-conta|esqueci-senha|checkout\/(sucesso|index)|auth\/google\/callback|redefinir-senha|termos|privacidade|planos|importar|cadernos\/lixeira)|layouts\/(auth|landing)|components\/review\/ReviewOnboardingEnd|components\/caderno\/(MaterialCardsState|MoveDialog|TrashDialog))\.vue/
// Pieces shared only by those pages: a shared chunk has no facade module, so it goes by what is inside it.
const ONE_SHOT_SHARED = /\/(components\/auth\/|components\/onboarding\/|components\/checkout\/|utils\/(mercadoPago|checkoutState|authMessages|organization|moveTargets|ankiMapping|guestProgress|postAuthRedirect)|composables\/useTrashBatch)/
// Blog and free tools (prd-blog-seo RF-B9): marketing read online, like the landing. Pages, their components, the
// articles (one chunk per content/blog/*.md) and the tools' math go to once-* chunks, out of the install download.
const BLOG_CHUNK = /\/(pages\/(blog|ferramentas)\/|pages\/quem-faz\.vue|components\/blog\/|content\/blog\/|utils\/(blog|forgetting|examPlan)\.ts|composables\/(useBlogSeo|useAreaQuery)\.ts|modules\/blog\/)|^\0#blog\//
// Reference page of the design system (prd-ds-v3-fundacao RF-2.5): only in `nuxt dev`. NUXT_DS_PAGE=1 keeps it
// in a production build for screenshots; even then its chunk is `dev-*`, out of the precache.
const DS_PAGE_FLAG = process.env.NUXT_DS_PAGE === '1'
const DS_PAGE_CHUNK = /\/pages\/_ds\.vue/

const SECURITY_HEADERS = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  // microphone=(self): RichInput records audio in the browser
  'Permissions-Policy': 'camera=(), microphone=(self), geolocation=(), payment=()',
  'Content-Security-Policy-Report-Only': CSP,
}

export default defineNuxtConfig({
  future: { compatibilityVersion: 4 },

  modules: [
    '@pinia/nuxt',
    '@vite-pwa/nuxt',
    '@nuxt/fonts',
    // Blog in Markdown, prerendered (prd-blog-seo, ADR-033): modules/blog
    '~~/modules/blog',
    // /_ds exists in dev (or with NUXT_DS_PAGE=1): without the route its page and components never get bundled
    (_options, nuxt) => {
      nuxt.hook('pages:extend', (pages) => {
        if (nuxt.options.dev || DS_PAGE_FLAG) return
        const i = pages.findIndex(p => p.path === '/_ds')
        if (i !== -1) pages.splice(i, 1)
      })
    },
  ],

  // Self-hosted at build time (/_fonts), font-display swap + metric fallback (RF-07).
  // Precache (prd-ds-v3-fundacao RF-0.4): the SW precaches every woff2, unicode-range or not, so only
  // what PT-BR needs ships. Latin covers U+0000-00FF (ç, ã, ê, à...) plus dashes, quotes and €; rare
  // latin-ext letters fall back to the system font. No italic file: <em>/cloze get a synthetic oblique.
  // Inter is variable: one file covers 400-700.
  fonts: {
    families: [
      { name: 'Inter', weights: [400, 500, 600, 700], styles: ['normal'], subsets: ['latin'], provider: 'google' },
    ],
  },

  css: ['~/assets/css/main.css'],

  sourcemap: { client: SENTRY_UPLOAD ? 'hidden' : false },

  vite: {
    plugins: [
      tailwindcss(),
      ...(SENTRY_UPLOAD
        ? [sentryVitePlugin({
            org: process.env.SENTRY_ORG,
            project: process.env.SENTRY_PROJECT,
            authToken: process.env.SENTRY_AUTH_TOKEN,
            release: { name: APP_VERSION },
            // Browser bundle only; the maps are deleted once uploaded
            sourcemaps: { assets: ['./.nuxt/dist/client/**'], filesToDeleteAfterUpload: ['./.nuxt/dist/client/**/*.map'] },
            telemetry: false,
          })]
        : []),
    ],
    $client: {
      build: {
        rollupOptions: {
          output: {
            chunkFileNames: (chunk: { facadeModuleId: string | null, moduleIds?: string[] }) => {
              const id = chunk.facadeModuleId ?? ''
              if (chunk.moduleIds?.length && chunk.moduleIds.every(m => ONE_SHOT_SHARED.test(m))) return '_nuxt/once-[hash].js'
              if (EMAIL_PAGE_CHUNK.test(id)) return '_nuxt/email-[hash].js'
              if (ANALYTICS_CHUNK.test(id)) return '_nuxt/analytics-[hash].js'
              if (CONSENT_CHUNK.test(id)) return '_nuxt/consent-[hash].js'
              if (ONE_SHOT_PAGE_CHUNK.test(id)) return '_nuxt/once-[hash].js'
              if (BLOG_CHUNK.test(id) || (chunk.moduleIds?.length && chunk.moduleIds.every(m => BLOG_CHUNK.test(m)))) return '_nuxt/once-[hash].js'
              if (DS_PAGE_CHUNK.test(id)) return '_nuxt/dev-[hash].js'
              return '_nuxt/[hash].js'
            },
          },
        },
      },
    },
    build: {
      // Mascots stay as files (runtime-cached by the SW) instead of base64 inside JS chunks; the Fraunces files
      // (ADR-035 §2) too, or the 2.4 KB of digits would land inside entry.css as base64
      assetsInlineLimit: (file: string) => (file.includes('/mascots/') || file.endsWith('.woff2') ? false : undefined),
    },
  },

  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'BAIGI',
      short_name: 'BAIGI',
      description: 'Estude de forma mais inteligente — repetição espaçada com IA',
      // DS v3 light page (--surface-page in assets/css/tokens.css)
      theme_color: THEME_COLOR.light,
      background_color: THEME_COLOR.light,
      display: 'standalone',
      scope: '/',
      start_url: '/hoje',
      icons: [
        { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      ],
      // Long press on the installed icon (Android/desktop; iOS has no shortcuts): straight to the sheet
      // "Questão que errei" (prd-questao-errada RF-F3), opened by ?add=question in layouts/default.vue
      shortcuts: [
        { name: 'Colar questão que errei', short_name: 'Colar questão', url: '/hoje?add=question', icons: [{ src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' }] },
      ],
    },
    workbox: {
      // A new release takes over at once and drops the precache of the previous one (autoUpdate already implies
      // these; written out so nobody turns them off by accident). The open page reloads when it takes control
      // (virtual:pwa-register); a chunk of the old release that still fails reloads once (plugins/chunk-recovery).
      skipWaiting: true,
      clientsClaim: true,
      cleanupOutdatedCaches: true,
      // No app shell with ssr:false + prerender: a '/' fallback served the landing
      // instead of the app. Offline page is Phase 2.
      navigateFallback: null,
      // Images are runtime-cached (below); never precache png/pdf (RF-05)
      globPatterns: ['**/*.{js,css,html,svg,ico,woff2}'],
      // Public/auth HTML only works online anyway (content or login): keep it out of the install download
      // index.html + _nuxt/index.*.css + landing/** (title font, clips, screens, sample: prd-landing-d RF-D14/D15): the
      // landing (prd-landing-v4 RF-L14), online like the rest of the marketing; the
      // installed app starts at /hoje and navigateFallback is null, so nothing offline ever served it
      globIgnores: ['index.html', 'landing/**', 'termos/**', 'privacidade/**', 'planos/**', 'ajuda/**', 'entrar/**', 'criar-conta/**', 'esqueci-senha/**', '_nuxt/email-*.js', '_nuxt/analytics-*.js', '_nuxt/consent-*.js', '_nuxt/once-*.js', '_nuxt/dev-*.js', '_nuxt/index.*.css', '_nuxt/baigi-it-*.woff2', 'blog/**', 'ferramentas/**', 'quem-faz/**', 'sitemap.xml', '_nuxt/blog-*.css'],
      // Heavy on-demand chunks (pdf.js ~330 KB) stay out of the install download;
      // maximumFileSizeToCacheInBytes would fail the build instead of skipping.
      manifestTransforms: [
        async entries => ({ manifest: entries.filter(e => e.size <= 300 * 1024), warnings: [] }),
      ],
      // API responses are never cached (RN-F03): no rule for the API origin
      runtimeCaching: [
        {
          urlPattern: /\/_nuxt\/.*\.(png|webp|avif|svg)$/,
          handler: 'CacheFirst',
          options: {
            cacheName: 'images',
            expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
          },
        },
      ],
    },
  },

  // ADR-020: authenticated app is client-only (session cookie lives on the API);
  // landing and auth entry pages are prerendered. Specific rules merge over '/**'.
  routeRules: {
    '/**': { ssr: false, headers: SECURITY_HEADERS },
    '/': { ssr: true, prerender: true },
    '/entrar': { ssr: true, prerender: true },
    '/criar-conta': { ssr: true, prerender: true },
    '/esqueci-senha': { ssr: true, prerender: true },
    // Onboarding v4 (prd-onboarding-v4 RF-F1): the first screen of the visitor's flow opens without the app
    '/comecar': { ssr: true, prerender: true },
    // Public pages (prd-ux-critica RF-F11): legal texts + offer/help for visitors.
    // /planos fetches /api/plans on the client; logged-in users are hidden by the
    // session-hint script until the app layout takes over.
    '/termos': { ssr: true, prerender: true },
    '/privacidade': { ssr: true, prerender: true },
    '/planos': { ssr: true, prerender: true },
    '/ajuda': { ssr: true, prerender: true },
    // Blog and free tools (prd-blog-seo): prerendered HTML with the full text; the routes come from modules/blog
    '/blog': { ssr: true, prerender: true },
    '/blog/**': { ssr: true, prerender: true },
    '/ferramentas': { ssr: true, prerender: true },
    // "Quem faz o Baigi": the author of the articles and the seller identification the checkout links to
    '/quem-faz': { ssr: true, prerender: true },
    '/ferramentas/**': { ssr: true, prerender: true },
    '/redefinir-senha': { ssr: false },
    // PostHog reverse proxy (RF-F10, anti-adblock). EU region (ADR-024, Questão 1).
    '/ingest/static/**': { proxy: 'https://eu-assets.i.posthog.com/static/**' },
    '/ingest/**': { proxy: 'https://eu.i.posthog.com/**' },
    '/auth/**': { ssr: false },
    // Legacy URLs: real 301 on the edge (prd-performance-frontend RF-01)
    '/dashboard': { redirect: { to: '/hoje', statusCode: 301 } },
    '/chat': { redirect: { to: '/hoje', statusCode: 301 } },
    '/stats': { redirect: { to: '/progresso', statusCode: 301 } },
    // The agenda moved into Progresso (prd-4f-progresso-v3 RF-F12); /provas/resultado (e-mail link) stays
    '/provas': { redirect: { to: '/progresso#provas', statusCode: 301 } },
    // The graph of all cadernos left in the navegação v3 (RF-11): /cadernos?view=graph is cleaned by the page
    '/graph': { redirect: { to: '/cadernos', statusCode: 301 } },
    '/documents': { redirect: { to: '/cadernos', statusCode: 301 } },
    '/decks': { redirect: { to: '/cadernos', statusCode: 301 } },
    '/decks/**': { redirect: { to: '/cadernos', statusCode: 301 } },
  },

  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:8037/api',
      // Used for /sanctum/csrf-cookie (outside /api)
      apiOrigin,
      // Result page after the exam (prd-retencao-lembretes RF-F09). Placeholders until defined:
      // testimonial card is hidden while empty; referral program is Futuro.
      testimonialUrl: process.env.NUXT_PUBLIC_TESTIMONIAL_URL || '',
      referralUrl: process.env.NUXT_PUBLIC_REFERRAL_URL || '/criar-conta?ref=placeholder',
      // Product analytics (prd-analytics-posthog). Empty key = plugin does nothing.
      posthogKey: process.env.NUXT_PUBLIC_POSTHOG_KEY || '',
      posthogHost: process.env.NUXT_PUBLIC_POSTHOG_HOST || '/ingest',
      posthogUiHost: process.env.NUXT_PUBLIC_POSTHOG_UI_HOST || 'https://eu.posthog.com',
      // Cloudflare Turnstile site key (public). Empty = captcha off (the API without TURNSTILE_SECRET_KEY asks for none).
      turnstileSiteKey: process.env.NUXT_PUBLIC_TURNSTILE_SITE_KEY || '',
      // Sentry DSN of the browser (errors only, after the analytics consent). Empty = the SDK is never downloaded.
      sentryDsn: process.env.NUXT_PUBLIC_SENTRY_DSN || '',
      sentryEnvironment: process.env.NUXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.VERCEL_ENV || 'production',
      appVersion: APP_VERSION,
      // Contact shown on /quem-faz and the blog (prd-blog-seo). The mailbox/redirect must exist before publishing.
      contactEmail: process.env.NUXT_PUBLIC_CONTACT_EMAIL || 'contato@baigi.com.br',
    },
  },

  app: {
    head: {
      htmlAttrs: { lang: 'pt-BR' },
      title: 'BAIGI',
      meta: [
        { charset: 'utf-8' },
        // viewport-fit=cover: without it iOS reports env(safe-area-inset-*) as 0 and the bottom bars sit on the home
        // indicator (prd-responsividade RF-4). The sides of landscape are handled in base.css and on the fixed bars.
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'description', content: 'Estude de forma mais inteligente — repetição espaçada com IA' },
        // Follow the OS until THEME_SCRIPT syncs them with the app theme (light, dark or system)
        { name: 'theme-color', content: THEME_COLOR.light, media: '(prefers-color-scheme: light)' },
        { name: 'theme-color', content: THEME_COLOR.dark, media: '(prefers-color-scheme: dark)' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        // default, not black-translucent: the installed app starts below the status bar (translucent drew the page under
        // the clock, with white text over the light page; prd-responsividade RF-4)
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
      ],
      script: [
        // Prerendered /, /entrar, /criar-conta: a user with the session hint cookie is
        // redirected to /hoje by the middleware once JS runs; hide the static page until
        // then (no landing flash). plugins/auth.client.ts removes the class; 4 s failsafe.
        { innerHTML: THEME_SCRIPT, tagPosition: 'head' },
        { innerHTML: SESSION_HINT_SCRIPT, tagPosition: 'head' },
      ],
      style: [
        { innerHTML: 'html.baigi-session body{visibility:hidden}' },
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      ],
    },
  },

  hooks: {
    // Source maps are never public (see SENTRY_UPLOAD): whatever reached the output is removed before deploy
    'nitro:build:public-assets'(nitro) {
      const dir = nitro.options.output.publicDir
      for (const file of readdirSync(dir, { recursive: true }) as string[]) {
        if (file.endsWith('.map')) rmSync(join(dir, file))
      }
    },
    // No <link rel="prefetch"> for analytics/consent chunks: without consent the browser must not
    // download posthog-js at all (prd-analytics-posthog RF-F05, "0 KB para quem recusa").
    'build:manifest'(manifest) {
      const lazyOnly = new Set(Object.keys(manifest).filter(k => /^(analytics|consent)-/.test(manifest[k]?.file ?? '')))
      for (const chunk of Object.values(manifest)) {
        if (lazyOnly.has(chunk.src ?? '')) {
          chunk.prefetch = false
          chunk.preload = false
        }
        chunk.dynamicImports &&= chunk.dynamicImports.filter(i => !lazyOnly.has(i))
      }
    },
  },

  compatibilityDate: '2026-04-13',
})
