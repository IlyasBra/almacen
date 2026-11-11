import { type Category } from '@/features/categories/types'
import { type Movement } from '@/features/movements/types'
import { type Product } from '@/features/products/types'

const CREATED = '2026-11-01T10:00:00.000Z'
let counter = 0
const nextId = (prefix: string) => `${prefix}-${String(++counter)}`

export function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: nextId('product'),
    name: 'Agua mineral 1,5 L',
    barcode: '',
    categoryId: null,
    unit: 'unidades',
    quantity: 10,
    minimum: 0,
    location: '',
    notes: '',
    photoId: null,
    createdAt: CREATED,
    updatedAt: CREATED,
    ...overrides,
  }
}

export function makeCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: nextId('category'),
    name: 'Bebidas',
    createdAt: CREATED,
    updatedAt: CREATED,
    ...overrides,
  }
}

export function makeMovement(overrides: Partial<Movement> = {}): Movement {
  return {
    id: nextId('movement'),
    productId: 'product-x',
    productName: 'Agua mineral 1,5 L',
    unit: 'unidades',
    kind: 'in',
    amount: 1,
    resultingQuantity: 1,
    note: '',
    createdAt: CREATED,
    ...overrides,
  }
}
