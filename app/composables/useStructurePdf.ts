/**
 * Composable wrapper para importação de PDF.
 * Gerencia o file input ref e delega pro store.
 */
export function useStructurePdf() {
  const store = useStructureStore()

  const fileInput = ref<HTMLInputElement | null>(null)

  function trigger() {
    fileInput.value?.click()
  }

  async function handleFile(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    await store.importPdf(file)
    if (fileInput.value) fileInput.value.value = ''
  }

  return {
    fileInput,
    generating: computed(() => store.generating),
    fileName: computed(() => store.fileName),
    trigger,
    handleFile,
  }
}
