import { categoryModel } from '@/features/categories/model'
import {
  type Category,
  type CategoryChanges,
  type CategoryInput,
} from '@/features/categories/types'
import { movementModel } from '@/features/movements/model'
import { type Movement, type MovementChanges, type MovementInput } from '@/features/movements/types'
import { DexiePhotoStore, InMemoryPhotoStore, type PhotoStore } from '@/features/photos/photoStore'
import { productModel } from '@/features/products/model'
import { type Product, type ProductChanges, type ProductInput } from '@/features/products/types'
import { InMemoryRepository } from '@/lib/data/inMemoryRepository'
import { type Repository } from '@/lib/data/repository'

import { AlmacenDatabase } from './database'
import { DexieRepository } from './dexieRepository'

export type ProductRepository = Repository<Product, ProductInput, ProductChanges>
export type MovementRepository = Repository<Movement, MovementInput, MovementChanges>
export type CategoryRepository = Repository<Category, CategoryInput, CategoryChanges>

export interface Repositories {
  products: ProductRepository
  movements: MovementRepository
  categories: CategoryRepository
  photos: PhotoStore
  /** False when data only lives in memory and is lost on reload. */
  isPersistent: boolean
}

export function createInMemoryRepositories(
  initial: { products?: Product[]; movements?: Movement[]; categories?: Category[] } = {},
): Repositories {
  return {
    products: new InMemoryRepository(productModel, initial.products),
    movements: new InMemoryRepository(movementModel, initial.movements),
    categories: new InMemoryRepository(categoryModel, initial.categories),
    photos: new InMemoryPhotoStore(),
    isPersistent: false,
  }
}

/**
 * Single place where concrete implementations are chosen. Swapping
 * IndexedDB for a backend later means changing this function only.
 */
export async function createRepositories(): Promise<Repositories> {
  try {
    const db = new AlmacenDatabase()
    await db.open()
    return {
      products: new DexieRepository(db.products, productModel),
      movements: new DexieRepository(db.movements, movementModel),
      categories: new DexieRepository(db.categories, categoryModel),
      photos: new DexiePhotoStore(db.photos),
      isPersistent: true,
    }
  } catch (error) {
    console.warn('IndexedDB is not available, falling back to memory storage.', error)
    return createInMemoryRepositories()
  }
}
