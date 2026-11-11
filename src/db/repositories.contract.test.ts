import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { InMemoryPhotoStore, DexiePhotoStore, type PhotoStore } from '@/features/photos/photoStore'
import { productModel } from '@/features/products/model'
import { type ProductInput } from '@/features/products/types'
import { InMemoryRepository } from '@/lib/data/inMemoryRepository'
import { EntityNotFoundError } from '@/lib/data/repository'
import { makeProduct } from '@/test/factories'

import { type ProductRepository } from './createRepositories'
import { AlmacenDatabase } from './database'
import { DexieRepository } from './dexieRepository'

const input: ProductInput = {
  name: 'Agua mineral',
  barcode: '8410000000001',
  categoryId: null,
  unit: 'paquetes',
  quantity: 14,
  minimum: 5,
  location: 'Estantería 1',
  notes: '',
  photoId: null,
}

interface Setup {
  products: ProductRepository
  photos: PhotoStore
  cleanup: () => Promise<void>
}

/**
 * Contract tests: the IndexedDB and in-memory implementations must behave
 * the same, so the app can fall back to memory without noticing.
 */
const implementations: [string, () => Setup][] = [
  [
    'Dexie',
    () => {
      const db = new AlmacenDatabase(`test-${crypto.randomUUID()}`)
      return {
        products: new DexieRepository(db.products, productModel),
        photos: new DexiePhotoStore(db.photos),
        cleanup: () => db.delete(),
      }
    },
  ],
  [
    'memory',
    () => ({
      products: new InMemoryRepository(productModel),
      photos: new InMemoryPhotoStore(),
      cleanup: () => Promise.resolve(),
    }),
  ],
]

describe.each(implementations)('%s storage', (_name, setup) => {
  let current: Setup

  beforeEach(() => {
    current = setup()
  })

  afterEach(async () => {
    await current.cleanup()
  })

  it('creates, updates and removes products', async () => {
    const created = await current.products.create(input)
    expect(await current.products.list()).toEqual([created])

    const updated = await current.products.update(created.id, { quantity: 9 })
    expect(updated.quantity).toBe(9)
    expect(await current.products.list()).toEqual([updated])

    await current.products.remove(created.id)
    expect(await current.products.list()).toEqual([])
  })

  it('rejects updates to a missing product', async () => {
    await expect(current.products.update('missing', { quantity: 1 })).rejects.toBeInstanceOf(
      EntityNotFoundError,
    )
  })

  it('replaces every product at once', async () => {
    await current.products.create(input)
    const restored = [makeProduct({ name: 'Arroz' })]
    await current.products.replaceAll(restored)
    expect(await current.products.list()).toEqual(restored)
  })

  it('stores, reads and removes photos', async () => {
    const id = await current.photos.add(new Blob(['abc'], { type: 'image/jpeg' }))
    // fake-indexeddb cannot clone jsdom Blobs faithfully, so only check presence here;
    // real browsers store Blobs natively.
    expect(await current.photos.get(id)).toBeDefined()
    expect((await current.photos.list()).map((photo) => photo.id)).toEqual([id])

    await current.photos.remove(id)
    expect(await current.photos.get(id)).toBeUndefined()
  })
})
