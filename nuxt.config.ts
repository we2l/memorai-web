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
      name: 'Memorai',
      short_name: 'Memorai',
      description: 'Memora aí — sua memória com IA',
      theme_color: '#522A6F',
      background_color: '#1A1A1D',
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
      htmlAttrs: { lang: 'pt-BR', class: 'dark' },
      title: 'Memorai',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Memora aí — sua memória com IA' },
        { name: 'theme-color', content: '#522A6F' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
      ],
      link: [
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.svg' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Inter:wght@400;500;600&family=Manrope:wght@600;700;800&display=swap' },
      ],
    },
  },

  compatibilityDate: '2026-04-13',
})
