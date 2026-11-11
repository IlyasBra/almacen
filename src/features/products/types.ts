export const UNITS = [
  'unidades',
  'cajas',
  'paquetes',
  'botellas',
  'latas',
  'kg',
  'litros',
  'metros',
] as const
export type Unit = (typeof UNITS)[number]

/** One item kept in the warehouse. */
export interface Product {
  id: string
  name: string
  /** Barcode as read by the scanner; '' when the product has none. */
  barcode: string
  /** Id of a Category, or null when the product has none. */
  categoryId: string | null
  unit: Unit
  /** Current stock. Never negative; decimals allowed (kg, litres). */
  quantity: number
  /** Stock at or below this shows the product as "low". 0 = no warning. */
  minimum: number
  location: string
  notes: string
  /** Id of the photo in the photo store, or null. */
  photoId: string | null
  createdAt: string
  updatedAt: string
}

export type ProductInput = Pick<
  Product,
  | 'name'
  | 'barcode'
  | 'categoryId'
  | 'unit'
  | 'quantity'
  | 'minimum'
  | 'location'
  | 'notes'
  | 'photoId'
>
export type ProductChanges = Partial<ProductInput>

export type StockStatus = 'ok' | 'low' | 'out'
