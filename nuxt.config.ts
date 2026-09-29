import tailwindcss from '@tailwindcss/vite'

// CSP in Report-Only (RN-09 of prd-hardening-seguranca): promote to enforcing
// only after a week without legitimate violations.
const apiOrigin = process.env.NUXT_PUBLIC_API_ORIGIN
  || new URL(process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:8037/api').origin
const s3Origin = process.env.CSP_S3_ORIGIN || 'https://*.amazonaws.com'

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  `img-src 'self' data: blob: ${s3Origin} ${apiOrigin} https://lh3.googleusercontent.com`,
  `media-src 'self' blob: ${s3Origin} ${apiOrigin}`,
  `connect-src 'self' ${apiOrigin} ${s3Origin}`,
  "worker-src 'self' blob: https://cdnjs.cloudflare.com",
  `frame-src 'self' blob: ${apiOrigin} ${s3Origin}`,
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

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

  modules: ['@pinia/nuxt', '@vite-pwa/nuxt', '@nuxt/fonts'],

  // Self-hosted at build time (/_fonts), font-display swap + metric fallback (RF-07)
  fonts: {
    families: [
      { name: 'Inter', weights: [400, 500, 600, 700], subsets: ['latin', 'latin-ext'], provider: 'google' },
      { name: 'Fredoka', weights: [600, 700], subsets: ['latin', 'latin-ext'], provider: 'google' },
    ],
  },

  css: ['~/assets/css/main.css'],

  vite: {
    plugins: [tailwindcss()],
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
      // DS v2 light surface (--bg-base in assets/css/main.css)
      theme_color: '#F9FAFD',
      background_color: '#F9FAFD',
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
    '/redefinir-senha': { ssr: false },
    '/auth/**': { ssr: false },
    // Legacy URLs: real 301 on the edge (prd-performance-frontend RF-01)
    '/dashboard': { redirect: { to: '/hoje', statusCode: 301 } },
    '/chat': { redirect: { to: '/hoje', statusCode: 301 } },
    '/stats': { redirect: { to: '/progresso', statusCode: 301 } },
    '/graph': { redirect: { to: '/cadernos?view=graph', statusCode: 301 } },
    '/documents': { redirect: { to: '/cadernos', statusCode: 301 } },
    '/decks': { redirect: { to: '/cadernos', statusCode: 301 } },
    '/decks/**': { redirect: { to: '/cadernos', statusCode: 301 } },
  },

  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:8037/api',
      // Used for /sanctum/csrf-cookie (outside /api)
      apiOrigin,
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
        { name: 'theme-color', content: '#F9FAFD', media: '(prefers-color-scheme: light)' },
        { name: 'theme-color', content: '#0F001F', media: '(prefers-color-scheme: dark)' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      ],
    },
  },

  compatibilityDate: '2026-04-13',
})
