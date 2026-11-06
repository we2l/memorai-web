/** "Salvo" beside a field that saves itself (prd-4g-conta-onboarding-v3 RF-F3): shows for a moment after each save. */
export function useSavedHint(ms = 2500) {
  const saved = ref(false)
  let timer: ReturnType<typeof setTimeout> | undefined
  function mark() {
    saved.value = true
    clearTimeout(timer)
    timer = setTimeout(() => { saved.value = false }, ms)
  }
  onBeforeUnmount(() => clearTimeout(timer))
  return { saved, mark }
}
