/**
 * Foto → cards: a phone photo goes up small. The API takes JPEG, PNG or WebP up to 5 MB (FromImageRequest), and a
 * photo from a 50+ MP camera passes that; the model reads at most ~2048 px anyway. Only big or other-type files
 * are redrawn; when the browser cannot decode the file (HEIC on some Android), the original goes and the API says why.
 */
const KEEP_BYTES = 3.5 * 1024 * 1024
const MAX_SIDE = 2048
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp']

export function photoNeedsShrink(file: { size: number, type: string }): boolean {
  return file.size > KEEP_BYTES || !ACCEPTED.includes(file.type)
}

/** The longest side at most `max`, the ratio kept; never upscaled. */
export function scaledSize(width: number, height: number, max = MAX_SIDE): { width: number, height: number } {
  const ratio = Math.min(1, max / Math.max(width, height))
  return { width: Math.round(width * ratio), height: Math.round(height * ratio) }
}

export async function photoForUpload(file: File): Promise<File> {
  if (!photoNeedsShrink(file) || typeof createImageBitmap !== 'function') return file
  try {
    // EXIF orientation applied (the default), so a portrait page stays upright
    const bitmap = await createImageBitmap(file)
    const { width, height } = scaledSize(bitmap.width, bitmap.height)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.85))
    if (!blob) return file
    return new File([blob], 'foto.jpg', { type: 'image/jpeg' })
  } catch {
    return file
  }
}
