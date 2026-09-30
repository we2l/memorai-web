import { describe, expect, it } from 'vitest'
import { htmlToPlain } from '~/utils/html'

describe('htmlToPlain', () => {
  it('remove tags e atributos, decodifica entidades', () => {
    expect(htmlToPlain('<p class="abc">Olá&nbsp;<b>mundo</b> &amp; cia</p>')).toBe('Olá mundo & cia')
  })
  it('null/vazio', () => {
    expect(htmlToPlain(null)).toBe('')
  })
})
