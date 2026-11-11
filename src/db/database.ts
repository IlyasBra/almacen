import { Dexie, type Table } from 'dexie'

import { type Category } from '@/features/categories/types'
import { type Movement } from '@/features/movements/types'
import { type Photo } from '@/features/photos/photoStore'
import { type Product } from '@/features/products/types'

export const DATABASE_NAME = 'almacen'

/**
 * IndexedDB schema. Only indexed fields are listed in `stores`; the rest of
 * each object is stored as-is. Photos are kept as Blobs in their own table so
 * listing products never loads image bytes.
 *
 * Never edit an existing version: add a new one with an upgrade function,
 * so data already on the phone is migrated on the next visit.
 */
export class AlmacenDatabase extends Dexie {
  declare products: Table<Product, string>
  declare movements: Table<Movement, string>
  declare categories: Table<Category, string>
  declare photos: Table<Photo, string>

  constructor(name: string = DATABASE_NAME) {
    super(name)

    this.version(1).stores({
      products: 'id, barcode, categoryId',
      movements: 'id, productId, createdAt',
      categories: 'id',
      photos: 'id',
    })
  }
}
