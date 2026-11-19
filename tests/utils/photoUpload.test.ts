import { describe, expect, it } from 'vitest'
import { photoNeedsShrink, scaledSize } from '~/utils/photoUpload'

describe('photoUpload (foto → cards)', () => {
  it('foto pequena em JPEG, PNG ou WebP vai como está', () => {
    expect(photoNeedsShrink({ size: 2_000_000, type: 'image/jpeg' })).toBe(false)
    expect(photoNeedsShrink({ size: 900_000, type: 'image/png' })).toBe(false)
  })
  it('foto grande ou de outro tipo é redesenhada', () => {
    expect(photoNeedsShrink({ size: 8_000_000, type: 'image/jpeg' })).toBe(true)
    expect(photoNeedsShrink({ size: 1_000_000, type: 'image/heic' })).toBe(true)
  })
  it('o lado maior fica em 2048 px, na proporção, sem aumentar', () => {
    expect(scaledSize(6000, 8000)).toEqual({ width: 1536, height: 2048 })
    expect(scaledSize(8160, 6120)).toEqual({ width: 2048, height: 1536 })
    expect(scaledSize(1080, 1920)).toEqual({ width: 1080, height: 1920 })
  })
})
