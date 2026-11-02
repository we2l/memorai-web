import { describe, expect, it } from 'vitest'
import { NOTEBOOK_COLORS } from '~/utils/colors'
import { hueOf, subjectTone } from '~/utils/subjects'

describe('subjectTone', () => {
  it('mapeia cada cor do seletor de caderno para o tom mais próximo das 8', () => {
    const byValue = Object.fromEntries(NOTEBOOK_COLORS.map(c => [c.value, subjectTone(c.value)]))
    expect(byValue).toEqual({ purple: 1, blue: 2, green: 3, orange: 4, red: 4, pink: 5, yellow: 7, gray: 8 })
  })

  it('o hex do seletor dá o mesmo tom que o nome', () => {
    for (const c of NOTEBOOK_COLORS) expect(subjectTone(c.hex), c.value).toBe(subjectTone(c.value))
  })

  it('hex curto, maiúsculas, cinza e petróleo', () => {
    expect(subjectTone('#36f')).toBe(2)
    expect(subjectTone('#0E7490')).toBe(6)
    expect(subjectTone('#808080')).toBe(8)
    expect(subjectTone('Purple')).toBe(1)
  })

  it('sem cor válida usa o índice (estável, com volta) e, sem índice, o cinza', () => {
    expect([0, 1, 7, 8, 15, -1].map(i => subjectTone(null, i))).toEqual([1, 2, 8, 1, 8, 8])
    expect(subjectTone('nao-e-cor', 2)).toBe(3)
    expect(subjectTone(undefined)).toBe(8)
  })

  it('hueOf rejeita o que não é hex', () => {
    expect(hueOf('blue')).toBeNull()
    expect(hueOf('#12345')).toBeNull()
    expect(hueOf('#FF0000')).toEqual({ hue: 0, saturation: 1 })
  })
})
