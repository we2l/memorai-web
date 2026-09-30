import tailwindcss from '@tailwindcss/vite'

// CSP in Report-Only (RN-09 of prd-hardening-seguranca): promote to enforcing
// only after a week without legitimate violations.
const apiOrigin = new URL(process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:8037/api').origin
const s3Origin = process.env.CSP_S3_ORIGIN || 'https://*.amazonaws.com'

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
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

export default defineNuxtConfig({
  future: { compatibilityVersion: 4 },

  modules: ['@pinia/nuxt', '@vite-pwa/nuxt'],

  css: ['~/assets/css/main.css'],

  vite: {
    plugins: [tailwindcss()],
  },

  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'BAIGI',
      short_name: 'BAIGI',
      description: 'Estude de forma mais inteligente — repetição espaçada com IA',
      theme_color: '#180838',
      background_color: '#180838',
      display: 'standalone',
      scope: '/',
      start_url: '/dashboard',
      icons: [
        { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      ],
    },
    workbox: {
      navigateFallback: '/',
      globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
    },
  },

  routeRules: {
    '/**': {
      headers: {
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        // microphone=(self): RichInput records audio in the browser
        'Permissions-Policy': 'camera=(), microphone=(self), geolocation=(), payment=()',
        'Content-Security-Policy-Report-Only': CSP,
      },
    },
  },

  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:8037/api',
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
        { name: 'theme-color', content: '#180838' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Fredoka:wght@600;700&family=Inter:wght@400;500;600;700&display=swap' },
      ],
    },
  },

  compatibilityDate: '2026-04-13',
})
