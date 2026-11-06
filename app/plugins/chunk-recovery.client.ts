// A tab or an installed app still running the previous release asks for chunks that no longer exist: Vercel answers
// them with the HTML of the app (200 text/html), the import fails and the screen fell on "Algo deu errado". Nuxt only
// reloads when the failure happens during a navigation; a lazy component or layout failing outside one stayed broken.
// Here any chunk failure reloads the page once, so the browser fetches the current release; a second failure within
// RELOAD_WINDOW_MS is real (offline, a broken deploy) and the error screen shows instead of a reload loop.
import { isChunkLoadError, shouldReloadForChunk } from '~/utils/chunkRecovery'

export default defineNuxtPlugin({
  name: 'baigi:chunk-recovery',
  enforce: 'pre',
  setup(nuxtApp) {
    const recover = () => {
      if (shouldReloadForChunk()) window.location.reload()
    }
    // vite:preloadError (Nuxt forwards it as app:chunkError): every lazy import through Vite's preload helper
    nuxtApp.hook('app:chunkError', recover)
    // A failed import() that reached the error page or Vue without the helper (Safari/Firefox wording included)
    nuxtApp.hook('app:error', (error) => { if (isChunkLoadError(error)) recover() })
    nuxtApp.hook('vue:error', (error) => { if (isChunkLoadError(error)) recover() })
  },
})
