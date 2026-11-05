import tailwindcss from '@tailwindcss/vite'

// CSP in Report-Only (RN-09 of prd-hardening-seguranca): promote to enforcing
// only after a week without legitimate violations.
const apiOrigin = process.env.NUXT_PUBLIC_API_ORIGIN
  || new URL(process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:8037/api').origin
const s3Origin = process.env.CSP_S3_ORIGIN || 'https://*.amazonaws.com'
// PostHog (ADR-024): same-origin /ingest proxy by default; the cloud hosts cover a direct
// NUXT_PUBLIC_POSTHOG_HOST and the SDK's assets (doc: connect-src/script-src *.posthog.com).
const posthogOrigins = 'https://*.posthog.com'

const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com ${posthogOrigins}`,
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  `img-src 'self' data: blob: ${s3Origin} ${apiOrigin} https://lh3.googleusercontent.com`,
  `media-src 'self' blob: ${s3Origin} ${apiOrigin}`,
  `connect-src 'self' ${apiOrigin} ${s3Origin} ${posthogOrigins}`,
  "worker-src 'self' blob: https://cdnjs.cloudflare.com",
  `frame-src 'self' blob: ${apiOrigin} ${s3Origin}`,
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

const SESSION_HINT_SCRIPT = `(function(){var d=document.documentElement;if(['/','/entrar','/criar-conta','/planos','/ajuda'].indexOf(location.pathname.replace(/\\/$/,'')||'/')<0)return;if(!/(?:^|;\\s*)baigi_logged_in=1/.test(document.cookie))return;d.classList.add('baigi-session');setTimeout(function(){d.classList.remove('baigi-session')},4000)})()`

// Page color of the DS v3 (--surface-page in app/assets/css/tokens.css, light and dark): the manifest and
// the theme-color metas need the literal. tests/scripts/pwaManifest.test.ts keeps both in sync with tokens.css.
const THEME_COLOR = { light: '#FAFAFB', dark: '#141218' }

// Theme before the first paint (prd-ds-v3-fundacao RF-1.4): localStorage['color-mode'] is light | dark |
// system (missing = system, the key the E2E set). .dark goes on <html> and color-scheme inline paints the
// canvas dark even before the CSS arrives; "system" follows prefers-color-scheme and its changes. The
// theme-color metas follow the app theme (not only the OS) once parsed. composables/useColorMode.ts
// does the same at runtime.
const THEME_SCRIPT = `(function(){var d=document.documentElement,q=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)');function pref(){try{var v=localStorage.getItem('color-mode');return v==='light'||v==='dark'?v:'system'}catch(e){return 'system'}}function meta(){var dark=d.classList.contains('dark'),m=document.querySelectorAll('meta[name="theme-color"]');for(var i=0;i<m.length;i++){m[i].setAttribute('content',dark?'${THEME_COLOR.dark}':'${THEME_COLOR.light}');m[i].removeAttribute('media')}}function apply(){var p=pref(),dark=p==='dark'||(p==='system'&&!!q&&q.matches);d.classList.toggle('dark',dark);d.style.colorScheme=dark?'dark':'light';meta()}apply();document.addEventListener('DOMContentLoaded',meta);if(q){var f=function(){if(pref()==='system')apply()};if(q.addEventListener)q.addEventListener('change',f);else if(q.addListener)q.addListener(f)}})()`

// Public pages opened from study e-mails (prd-retencao-lembretes): online-only like
// termos/privacidade, so their chunks carry a prefix and stay out of the SW precache.
const EMAIL_PAGE_CHUNK = /\/pages\/(lembretes\/desativado|provas\/resultado)\.vue/
// posthog-js is imported only after consent (prd-analytics-posthog RF-F05): never precached.
const ANALYTICS_CHUNK = /\/node_modules\/posthog-js\//
// Consent banner/modal only matter online on a first visit: kept out of the precache too.
const CONSENT_CHUNK = /\/components\/ui\/Consent(Banner|Modal)\.vue/
// One-shot pages that only work online (onboarding, the auth screens, OAuth and checkout returns, reset link,
// the first batch's end): fetched when opened instead of in every install download (precache budget,
// prd-correcoes-experiencia Q2, prd-4g-conta-onboarding-v3).
const ONE_SHOT_PAGE_CHUNK = /\/(pages\/(comecar|entrar|criar-conta|esqueci-senha|checkout\/sucesso|auth\/google\/callback|redefinir-senha|termos|privacidade|ajuda|planos)|layouts\/auth|components\/review\/ReviewOnboardingEnd)\.vue/
// Pieces shared only by those pages: a shared chunk has no facade module, so it goes by what is inside it.
const ONE_SHOT_SHARED = /\/(components\/auth\/|components\/onboarding\/|utils\/authMessages)/
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

  vite: {
    plugins: [tailwindcss()],
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
              if (DS_PAGE_CHUNK.test(id)) return '_nuxt/dev-[hash].js'
              return '_nuxt/[hash].js'
            },
          },
        },
      },
    },
    build: {
      // Mascots stay as files (runtime-cached by the SW) instead of base64 inside JS chunks
      assetsInlineLimit: (file: string) => (file.includes('/mascots/') ? false : undefined),
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
    },
    workbox: {
      // No app shell with ssr:false + prerender: a '/' fallback served the landing
      // instead of the app. Offline page is Phase 2.
      navigateFallback: null,
      // Images are runtime-cached (below); never precache png/pdf (RF-05)
      globPatterns: ['**/*.{js,css,html,svg,ico,woff2}'],
      // Public/auth HTML only works online anyway (content or login): keep it out of the install download
      globIgnores: ['termos/**', 'privacidade/**', 'planos/**', 'ajuda/**', 'entrar/**', 'criar-conta/**', 'esqueci-senha/**', '_nuxt/email-*.js', '_nuxt/analytics-*.js', '_nuxt/consent-*.js', '_nuxt/once-*.js', '_nuxt/dev-*.js'],
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
    // Public pages (prd-ux-critica RF-F11): legal texts + offer/help for visitors.
    // /planos fetches /api/plans on the client; logged-in users are hidden by the
    // session-hint script until the app layout takes over.
    '/termos': { ssr: true, prerender: true },
    '/privacidade': { ssr: true, prerender: true },
    '/planos': { ssr: true, prerender: true },
    '/ajuda': { ssr: true, prerender: true },
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
      appVersion: process.env.NUXT_PUBLIC_APP_VERSION || (process.env.VERCEL_GIT_COMMIT_SHA || '').slice(0, 7) || 'dev',
    },
  },

  app: {
    head: {
      htmlAttrs: { lang: 'pt-BR' },
      title: 'BAIGI',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Estude de forma mais inteligente — repetição espaçada com IA' },
        // Follow the OS until THEME_SCRIPT syncs them with the app theme (light, dark or system)
        { name: 'theme-color', content: THEME_COLOR.light, media: '(prefers-color-scheme: light)' },
        { name: 'theme-color', content: THEME_COLOR.dark, media: '(prefers-color-scheme: dark)' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
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
