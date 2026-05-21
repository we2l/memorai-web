import tailwindcss from '@tailwindcss/vite'

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
        { src: '/pwa-192x192.svg', sizes: '192x192', type: 'image/svg+xml' },
        { src: '/pwa-512x512.svg', sizes: '512x512', type: 'image/svg+xml' },
        { src: '/pwa-512x512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any maskable' },
      ],
    },
    workbox: {
      navigateFallback: '/',
      globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
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
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.svg' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Fredoka:wght@600;700&family=Inter:wght@400;500;600&family=Poppins:wght@600;700;800&display=swap' },
      ],
    },
  },

  compatibilityDate: '2026-04-13',
})
