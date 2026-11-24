import { matchesQuery } from '@/lib/text'

import { stockStatus } from './model'
import { type Product, type StockStatus } from './types'

/** "all", "none" (no category) or a category id. */
export type CategoryFilter = 'all' | 'none' | (string & {})

export interface ProductFilter {
  query: string
  category: CategoryFilter
  status: StockStatus | 'all'
}

export const EMPTY_PRODUCT_FILTER: ProductFilter = { query: '', category: 'all', status: 'all' }

export function productStatus(product: Pick<Product, 'quantity' | 'minimum'>): StockStatus {
  return stockStatus(product.quantity, product.minimum)
}

/** Whether the product belongs to the chosen category ('all' and 'none' are not ids). */
export function inCategory(
  product: Pick<Product, 'categoryId'>,
  category: CategoryFilter,
): boolean {
  if (category === 'all') return true
  if (category === 'none') return product.categoryId === null
  return product.categoryId === category
}

/**
 * Products matching every part of the filter. The search looks at the name,
 * barcode and notes, ignoring case and accents.
 */
export function filterProducts(products: readonly Product[], filter: ProductFilter): Product[] {
  return products.filter((product) => {
    if (!inCategory(product, filter.category)) return false
    if (filter.status !== 'all' && productStatus(product) !== filter.status) return false
    const text = [product.name, product.barcode, product.notes].join(' ')
    return matchesQuery(text, filter.query)
  })
}

export interface StockSummary {
  total: number
  low: number
  out: number
}

export function summarizeStock(products: readonly Product[]): StockSummary {
  const summary: StockSummary = { total: products.length, low: 0, out: 0 }
  for (const product of products) {
    const status = productStatus(product)
    if (status === 'low') summary.low++
    if (status === 'out') summary.out++
  }
  return summary
}

/** Products to order: sold out first, then low, each alphabetical. */
export function restockList(products: readonly Product[]): Product[] {
  return products
    .filter((product) => productStatus(product) !== 'ok')
    .toSorted(
      (a, b) =>
        Number(productStatus(a) !== 'out') - Number(productStatus(b) !== 'out') ||
        a.name.localeCompare(b.name),
    )
}

/**
 * Same product code written two ways: a 12-digit UPC-A and the EAN-13 that
 * is the same digits with a 0 in front. Older scans may have stored either.
 */
function sameBarcode(a: string, b: string): boolean {
  const pad = (code: string) => (/^\d{12}$/.test(code) ? `0${code}` : code)
  return pad(a.trim()) === pad(b.trim())
}

export function findByBarcode(products: readonly Product[], barcode: string): Product | undefined {
  const code = barcode.trim()
  return code ? products.find((product) => sameBarcode(product.barcode, code)) : undefined
}
