import { describe, expect, it } from 'vitest'

import { parseOptionalQuantity } from './quantity'

describe('parseOptionalQuantity', () => {
  it('понимает целые числа и десятичную запятую', () => {
    expect(parseOptionalQuantity('2')).toBe(2)
    expect(parseOptionalQuantity('1,5')).toBe(1.5)
    expect(parseOptionalQuantity(',5')).toBe(0.5)
  })

  it('оставляет пустое количество пустым', () => {
    expect(parseOptionalQuantity('  ')).toBeNull()
  })

  it('отклоняет неоднозначный ввод', () => {
    expect(() => parseOptionalQuantity('1,2,3')).toThrow('Введите количество числом')
    expect(() => parseOptionalQuantity('полстакана')).toThrow('Введите количество числом')
  })
})
