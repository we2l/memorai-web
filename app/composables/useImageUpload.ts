const MAX_SIZE = 5 * 1024 * 1024 // 5MB
const MAX_DIMENSION = 1920
const QUALITY = 0.8

function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      let { width, height } = img
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob)
          else reject(new Error('Falha na compressão'))
        },
        'image/webp',
        QUALITY,
      )
    }
    img.onerror = () => reject(new Error('Falha ao carregar imagem'))
    img.src = URL.createObjectURL(file)
  })
}

export function useImageUpload() {
  const { $api } = useNuxtApp()
  const toast = useToast()

  async function uploadImage(file: File): Promise<string | null> {
    if (file.size > MAX_SIZE) {
      toast.show('Imagem muito grande (máx. 5MB).', 'error')
      return null
    }

    try {
      const compressed = await compressImage(file)
      const formData = new FormData()
      formData.append('image', compressed, 'image.webp')
      const res = await $api<any>('/images/upload', { method: 'POST', body: formData })
      return res.data.url
    } catch {
      toast.show('Erro ao enviar imagem.', 'error')
      return null
    }
  }

  return { uploadImage }
}
