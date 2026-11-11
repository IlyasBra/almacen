import { getLanguage, intlLocale, type MessageKey, t } from '@/i18n'
import { type EntityModel } from '@/lib/data/repository'

import {
  type Product,
  type ProductChanges,
  type ProductInput,
  type StockStatus,
  UNITS,
  type Unit,
} from './types'

export const PRODUCT_NAME_MAX_LENGTH = 80

/** Rounds away floating point noise: 0.1 + 0.2 → 0.3. */
export function roundQuantity(value: number): number {
  return Math.round(value * 1000) / 1000
}

/** Quantities are never negative. */
export function clampQuantity(value: number): number {
  return Number.isFinite(value) ? Math.max(0, roundQuantity(value)) : 0
}

function clean(input: ProductInput): ProductInput {
  return {
    name: input.name.trim(),
    barcode: input.barcode.trim(),
    categoryId: input.categoryId,
    unit: input.unit,
    quantity: clampQuantity(input.quantity),
    minimum: clampQuantity(input.minimum),
    location: input.location.trim(),
    notes: input.notes.trim(),
    photoId: input.photoId,
  }
}

export function buildProduct(input: ProductInput, id: string, now: Date): Product {
  const timestamp = now.toISOString()
  return { id, ...clean(input), createdAt: timestamp, updatedAt: timestamp }
}

export function applyProductChanges(product: Product, changes: ProductChanges, now: Date): Product {
  const merged: ProductInput = {
    name: changes.name ?? product.name,
    barcode: changes.barcode ?? product.barcode,
    categoryId: changes.categoryId === undefined ? product.categoryId : changes.categoryId,
    unit: changes.unit ?? product.unit,
    quantity: changes.quantity ?? product.quantity,
    minimum: changes.minimum ?? product.minimum,
    location: changes.location ?? product.location,
    notes: changes.notes ?? product.notes,
    photoId: changes.photoId === undefined ? product.photoId : changes.photoId,
  }
  return {
    id: product.id,
    ...clean(merged),
    createdAt: product.createdAt,
    updatedAt: now.toISOString(),
  }
}

export const productModel: EntityModel<Product, ProductInput, ProductChanges> = {
  build: buildProduct,
  applyChanges: applyProductChanges,
}

export function stockStatus(quantity: number, minimum: number): StockStatus {
  if (quantity <= 0) return 'out'
  if (minimum > 0 && quantity <= minimum) return 'low'
  return 'ok'
}

const STATUS_KEYS: Record<StockStatus, MessageKey> = {
  ok: 'status.ok',
  low: 'status.low',
  out: 'status.out',
}

export function stockStatusLabel(status: StockStatus): string {
  return t(STATUS_KEYS[status])
}

/** Units are stored as Spanish words and shown in the interface language. */
export function unitLabel(unit: string): string {
  return isUnit(unit) ? t(`unit.${unit}`) : unit
}

/** How many to order to reach twice the minimum. 0 when nothing is needed. */
export function suggestedOrder(product: Pick<Product, 'quantity' | 'minimum'>): number {
  return clampQuantity(product.minimum * 2 - product.quantity)
}

export interface ProductInputErrors {
  name?: string
  barcode?: string
  quantity?: string
  minimum?: string
}

/** `others` are the other products, to reject a barcode that is already used. */
export function validateProductInput(
  input: ProductInput,
  others: readonly Product[],
): ProductInputErrors {
  const errors: ProductInputErrors = {}
  const name = input.name.trim()
  if (name.length === 0) errors.name = t('error.nameRequired')
  else if (name.length > PRODUCT_NAME_MAX_LENGTH)
    errors.name = t('error.nameTooLong', { max: PRODUCT_NAME_MAX_LENGTH })

  const barcode = input.barcode.trim()
  const owner = barcode ? others.find((product) => product.barcode === barcode) : undefined
  if (owner) errors.barcode = t('error.barcodeTaken', { name: owner.name })

  if (!Number.isFinite(input.quantity) || input.quantity < 0) errors.quantity = t('error.quantity')
  if (!Number.isFinite(input.minimum) || input.minimum < 0) errors.minimum = t('error.minimum')
  return errors
}

export function isUnit(value: unknown): value is Unit {
  return typeof value === 'string' && (UNITS as readonly string[]).includes(value)
}

/** Reads a number typed by a person: "1,5" and "1.5" both work. Empty → 0. */
export function parseAmount(text: string): number {
  const trimmed = text.trim()
  if (trimmed === '') return 0
  const value = Number(trimmed.replace(',', '.'))
  return Number.isFinite(value) ? value : Number.NaN
}

const numberFormats = new Map<string, Intl.NumberFormat>()

/** 1234.5 → "1234,5" in Spanish, "1,234.5" in English… in the interface language. */
export function formatAmount(value: number): string {
  const locale = intlLocale(getLanguage())
  let format = numberFormats.get(locale)
  if (!format) {
    format = new Intl.NumberFormat(locale, { maximumFractionDigits: 3 })
    numberFormats.set(locale, format)
  }
  return format.format(value)
}
