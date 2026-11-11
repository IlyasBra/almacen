import { describe, expect, it } from 'vitest'

import { makeProduct } from '@/test/factories'

import { formatAmount } from './model'
import {
  EMPTY_PRODUCT_FILTER,
  filterProducts,
  findByBarcode,
  restockList,
  restockText,
  summarizeStock,
} from './selectors'

const agua = makeProduct({
  name: 'Agua mineral',
  categoryId: 'bebidas',
  quantity: 14,
  minimum: 5,
  barcode: '111',
})
const lejia = makeProduct({
  name: 'Lejía',
  categoryId: 'limpieza',
  quantity: 3,
  minimum: 6,
  unit: 'botellas',
  location: 'Estantería 3',
})
const arroz = makeProduct({ name: 'Arroz', categoryId: null, quantity: 0, minimum: 10 })
const all = [agua, lejia, arroz]

describe('product selectors', () => {
  it('searches name, barcode and location without caring about accents', () => {
    expect(filterProducts(all, { ...EMPTY_PRODUCT_FILTER, query: 'lejia' })).toEqual([lejia])
    expect(filterProducts(all, { ...EMPTY_PRODUCT_FILTER, query: '111' })).toEqual([agua])
    expect(filterProducts(all, { ...EMPTY_PRODUCT_FILTER, query: 'estanteria' })).toEqual([lejia])
  })

  it('filters by category, by "no category" and by stock status', () => {
    expect(filterProducts(all, { ...EMPTY_PRODUCT_FILTER, category: 'bebidas' })).toEqual([agua])
    expect(filterProducts(all, { ...EMPTY_PRODUCT_FILTER, category: 'none' })).toEqual([arroz])
    expect(filterProducts(all, { ...EMPTY_PRODUCT_FILTER, status: 'low' })).toEqual([lejia])
  })

  it('summarizes stock', () => {
    expect(summarizeStock(all)).toEqual({ total: 3, low: 1, out: 1 })
  })

  it('lists products to restock, sold out first', () => {
    expect(restockList(all)).toEqual([arroz, lejia])
    expect(restockText(all, formatAmount)).toBe(
      [
        'Pedido para el almacén:',
        '- Arroz: quedan 0 unidades (pedir unas 20)',
        '- Lejía: quedan 3 botellas (pedir unas 9)',
      ].join('\n'),
    )
  })

  it('finds a product by barcode, ignoring blanks', () => {
    expect(findByBarcode(all, ' 111 ')).toBe(agua)
    expect(findByBarcode(all, '')).toBeUndefined()
  })
})
