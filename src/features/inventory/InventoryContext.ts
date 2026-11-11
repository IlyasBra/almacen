import { createContext } from 'react'

import { type Category } from '@/features/categories/types'
import { type Movement } from '@/features/movements/types'
import { type Photo } from '@/features/photos/photoStore'
import { type Product, type ProductInput } from '@/features/products/types'
import { type StoreStatus } from '@/hooks/useRepositoryStore'

/** What to do with a product's photo when saving the form. */
export type PhotoChange = { kind: 'keep' } | { kind: 'remove' } | { kind: 'replace'; blob: Blob }

/** Everything restored from a backup, all at once. */
export interface InventorySnapshot {
  products: Product[]
  movements: Movement[]
  categories: Category[]
  photos: Photo[]
}

export interface InventoryContextValue {
  /** Sorted by name. */
  products: Product[]
  /** Newest first. */
  movements: Movement[]
  /** Alphabetical. */
  categories: Category[]
  status: StoreStatus
  /** Last failed action, shown to the user. */
  error: string | null
  dismissError: () => void

  /** Resolves to the new product, or null if it could not be saved. */
  createProduct: (input: ProductInput, photo: Blob | null) => Promise<Product | null>
  updateProduct: (id: string, input: ProductInput, photo: PhotoChange) => Promise<boolean>
  deleteProduct: (id: string) => Promise<boolean>
  /** Adds (positive) or removes (negative) stock and logs the movement. */
  changeStock: (id: string, delta: number, note?: string) => Promise<boolean>
  assignBarcode: (id: string, barcode: string) => Promise<boolean>

  createCategory: (name: string) => Promise<Category | null>
  renameCategory: (id: string, name: string) => Promise<boolean>
  /** Deletes the category; its products are left without one. */
  deleteCategory: (id: string) => Promise<boolean>

  getPhoto: (id: string) => Promise<Blob | undefined>
  listPhotos: () => Promise<Photo[]>
  replaceAll: (snapshot: InventorySnapshot) => Promise<boolean>
}

export const InventoryContext = createContext<InventoryContextValue | null>(null)
