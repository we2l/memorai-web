import { captureFirstTouch } from '~/utils/firstTouch'

/**
 * Keeps the campaign of the first visit (utils/firstTouch.ts). Read from the address at boot and, because a
 * prerendered page gets its query back only after hydration (/entrar, /comecar), once more after the first navigation.
 */
export default defineNuxtPlugin(() => {
  captureFirstTouch(window.location.href)
  const stop = useRouter().afterEach(() => {
    captureFirstTouch(window.location.href)
    stop()
  })
})
