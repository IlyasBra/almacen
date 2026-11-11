import { describe, expect, it } from 'vitest'

import { makeProduct } from '@/test/factories'

import {
  applyProductChanges,
  buildProduct,
  clampQuantity,
  formatAmount,
  parseAmount,
  stockStatus,
  suggestedOrder,
  validateProductInput,
} from './model'
import { type ProductInput } from './types'

const NOW = new Date('2026-11-11T12:00:00.000Z')

const input: ProductInput = {
  name: '  Lejía 2 L ',
  barcode: ' 8410000000001 ',
  categoryId: null,
  unit: 'botellas',
  quantity: 6,
  minimum: 2,
  location: ' Estantería 3 ',
  notes: '',
  photoId: null,
}

describe('product model', () => {
  it('builds a product with trimmed text and timestamps', () => {
    expect(buildProduct(input, 'p1', NOW)).toEqual({
      ...input,
      id: 'p1',
      name: 'Lejía 2 L',
      barcode: '8410000000001',
      location: 'Estantería 3',
      createdAt: NOW.toISOString(),
      updatedAt: NOW.toISOString(),
    })
  })

  it('applies partial changes and keeps the rest', () => {
    const product = makeProduct({ name: 'Arroz', categoryId: 'c1', photoId: 'ph1' })
    const next = applyProductChanges(product, { quantity: 3, categoryId: null }, NOW)
    expect(next).toMatchObject({ name: 'Arroz', quantity: 3, categoryId: null, photoId: 'ph1' })
    expect(next.createdAt).toBe(product.createdAt)
    expect(next.updatedAt).toBe(NOW.toISOString())
  })

  it('never stores negative stock and removes rounding noise', () => {
    expect(clampQuantity(-2)).toBe(0)
    expect(clampQuantity(0.1 + 0.2)).toBe(0.3)
    expect(clampQuantity(Number.NaN)).toBe(0)
  })

  it.each([
    [0, 5, 'out'],
    [3, 5, 'low'],
    [5, 5, 'low'],
    [6, 5, 'ok'],
    [1, 0, 'ok'],
  ] as const)('quantity %s with minimum %s is %s', (quantity, minimum, status) => {
    expect(stockStatus(quantity, minimum)).toBe(status)
  })

  it('suggests ordering up to twice the minimum', () => {
    expect(suggestedOrder({ quantity: 2, minimum: 5 })).toBe(8)
    expect(suggestedOrder({ quantity: 12, minimum: 5 })).toBe(0)
  })

  it('validates name, numbers and duplicated barcodes', () => {
    const other = makeProduct({ name: 'Agua', barcode: '8410000000001' })
    expect(validateProductInput({ ...input, name: ' ' }, [])).toEqual({
      name: 'Escribe un nombre.',
    })
    expect(validateProductInput(input, [other])).toEqual({
      barcode: 'Ese código ya es de «Agua».',
    })
    expect(validateProductInput({ ...input, quantity: Number.NaN, minimum: -1 }, [])).toEqual({
      quantity: 'Escribe una cantidad de 0 o más.',
      minimum: 'Escribe un número de 0 o más.',
    })
    expect(validateProductInput(input, [])).toEqual({})
  })

  it('reads amounts with comma or dot and formats them in Spanish', () => {
    expect(parseAmount('1,5')).toBe(1.5)
    expect(parseAmount('2.25')).toBe(2.25)
    expect(parseAmount('')).toBe(0)
    expect(parseAmount('abc')).toBeNaN()
    expect(formatAmount(1.5)).toBe('1,5')
  })
})
