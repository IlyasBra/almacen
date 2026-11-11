import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { type Repositories } from '@/db/createRepositories'
import { categoryModel, sortCategories } from '@/features/categories/model'
import { movementModel, sortMovements } from '@/features/movements/model'
import { type MovementInput } from '@/features/movements/types'
import { clampQuantity, productModel, roundQuantity } from '@/features/products/model'
import { type Product, type ProductInput } from '@/features/products/types'
import { type StoreErrorMessages, useRepositoryStore } from '@/hooks/useRepositoryStore'

import {
  InventoryContext,
  type InventoryContextValue,
  type InventorySnapshot,
  type PhotoChange,
} from './InventoryContext'

const PRODUCT_MESSAGES: StoreErrorMessages = {
  create: 'No se ha podido guardar el producto.',
  update: 'No se ha podido guardar el cambio.',
  remove: 'No se ha podido borrar el producto.',
  replace: 'No se han podido restaurar los productos.',
}
const MOVEMENT_MESSAGES: StoreErrorMessages = {
  create: 'No se ha podido apuntar el movimiento.',
  update: 'No se ha podido apuntar el movimiento.',
  remove: 'No se ha podido borrar el movimiento.',
  replace: 'No se han podido restaurar los movimientos.',
}
const CATEGORY_MESSAGES: StoreErrorMessages = {
  create: 'No se ha podido crear la categoría.',
  update: 'No se ha podido renombrar la categoría.',
  remove: 'No se ha podido borrar la categoría.',
  replace: 'No se han podido restaurar las categorías.',
}

interface InventoryProviderProps {
  repositories: Repositories
  children: ReactNode
}

/**
 * Products, movements and categories, plus the actions that keep them
 * consistent: every stock change also writes a movement, deleting a
 * category clears it from its products, and photos follow their product.
 */
export function InventoryProvider({ repositories, children }: InventoryProviderProps) {
  const {
    items: productItems,
    status: productStatus,
    error: productError,
    dismissError: dismissProductError,
    create: insertProduct,
    update: patchProduct,
    remove: removeProduct,
    replaceAll: replaceProducts,
  } = useRepositoryStore(repositories.products, productModel, PRODUCT_MESSAGES)
  const {
    items: movementItems,
    status: movementStatus,
    error: movementError,
    dismissError: dismissMovementError,
    create: logMovement,
    replaceAll: replaceMovements,
  } = useRepositoryStore(repositories.movements, movementModel, MOVEMENT_MESSAGES)
  const {
    items: categoryItems,
    status: categoryStatus,
    error: categoryError,
    dismissError: dismissCategoryError,
    create: insertCategory,
    update: patchCategory,
    remove: removeCategory,
    replaceAll: replaceCategories,
  } = useRepositoryStore(repositories.categories, categoryModel, CATEGORY_MESSAGES)
  const photos = repositories.photos
  const [photoError, setPhotoError] = useState<string | null>(null)

  // Latest products for the actions, without re-creating them on every change.
  const productsRef = useRef(productItems)
  useEffect(() => {
    productsRef.current = productItems
  }, [productItems])

  const createProduct = useCallback(
    async (input: ProductInput, photo: Blob | null): Promise<Product | null> => {
      let photoId: string | null = null
      if (photo) {
        try {
          photoId = await photos.add(photo)
        } catch (error) {
          console.error(error)
          setPhotoError('No se ha podido guardar la foto.')
          return null
        }
      }
      const product = await insertProduct({ ...input, photoId })
      if (!product) {
        if (photoId) await photos.remove(photoId).catch(() => undefined)
        return null
      }
      if (product.quantity > 0) {
        await logMovement(movementFor(product, 'new', product.quantity, 'Producto nuevo'))
      }
      return product
    },
    [photos, insertProduct, logMovement],
  )

  const updateProduct = useCallback(
    async (id: string, input: ProductInput, photo: PhotoChange): Promise<boolean> => {
      const before = productsRef.current.find((product) => product.id === id)
      if (!before) return false

      let photoId = before.photoId
      if (photo.kind === 'remove') photoId = null
      if (photo.kind === 'replace') {
        try {
          photoId = await photos.add(photo.blob)
        } catch (error) {
          console.error(error)
          setPhotoError('No se ha podido guardar la foto.')
          return false
        }
      }

      const saved = await patchProduct(id, { ...input, photoId })
      if (!saved) {
        if (photo.kind === 'replace' && photoId) await photos.remove(photoId).catch(() => undefined)
        return false
      }
      if (before.photoId && before.photoId !== photoId) {
        await photos.remove(before.photoId).catch(() => undefined)
      }
      const after = clampQuantity(input.quantity)
      if (after !== before.quantity) {
        await logMovement(
          movementFor(
            { ...before, name: input.name.trim(), unit: input.unit, quantity: after },
            'adjust',
            Math.abs(roundQuantity(after - before.quantity)),
            `Antes había ${String(before.quantity).replace('.', ',')}`,
          ),
        )
      }
      return true
    },
    [photos, patchProduct, logMovement],
  )

  const deleteProduct = useCallback(
    async (id: string): Promise<boolean> => {
      const product = productsRef.current.find((item) => item.id === id)
      if (!product) return false
      const done = await removeProduct(id)
      if (done && product.photoId) await photos.remove(product.photoId).catch(() => undefined)
      return done
    },
    [photos, removeProduct],
  )

  const changeStock = useCallback(
    async (id: string, delta: number, note = ''): Promise<boolean> => {
      const product = productsRef.current.find((item) => item.id === id)
      if (!product) return false
      const after = clampQuantity(product.quantity + delta)
      const real = roundQuantity(after - product.quantity)
      if (real === 0) return true
      // Keep the ref in step so a second change right after builds on this one.
      productsRef.current = productsRef.current.map((item) =>
        item.id === id ? { ...item, quantity: after } : item,
      )
      const done = await patchProduct(id, { quantity: after })
      if (!done) return false
      await logMovement(
        movementFor({ ...product, quantity: after }, real > 0 ? 'in' : 'out', Math.abs(real), note),
      )
      return true
    },
    [patchProduct, logMovement],
  )

  const assignBarcode = useCallback(
    (id: string, barcode: string) => patchProduct(id, { barcode }),
    [patchProduct],
  )

  const createCategory = useCallback((name: string) => insertCategory({ name }), [insertCategory])
  const renameCategory = useCallback(
    (id: string, name: string) => patchCategory(id, { name }),
    [patchCategory],
  )
  const deleteCategory = useCallback(
    async (id: string): Promise<boolean> => {
      const done = await removeCategory(id)
      if (!done) return false
      for (const product of productsRef.current.filter((item) => item.categoryId === id)) {
        await patchProduct(product.id, { categoryId: null })
      }
      return true
    },
    [removeCategory, patchProduct],
  )

  const replaceAll = useCallback(
    async (snapshot: InventorySnapshot): Promise<boolean> => {
      try {
        await photos.replaceAll(snapshot.photos)
      } catch (error) {
        console.error(error)
        setPhotoError('No se han podido restaurar las fotos.')
        return false
      }
      return (
        (await replaceCategories(snapshot.categories)) &&
        (await replaceProducts(snapshot.products)) &&
        (await replaceMovements(snapshot.movements))
      )
    },
    [photos, replaceCategories, replaceProducts, replaceMovements],
  )

  const getPhoto = useCallback((id: string) => photos.get(id), [photos])
  const listPhotos = useCallback(() => photos.list(), [photos])

  const statuses = [productStatus, movementStatus, categoryStatus]
  const status = statuses.includes('error')
    ? 'error'
    : statuses.every((item) => item === 'ready')
      ? 'ready'
      : 'loading'
  const error = productError ?? movementError ?? categoryError ?? photoError

  const dismissError = useCallback(() => {
    dismissProductError()
    dismissMovementError()
    dismissCategoryError()
    setPhotoError(null)
  }, [dismissProductError, dismissMovementError, dismissCategoryError])

  const value = useMemo<InventoryContextValue>(
    () => ({
      products: productItems.toSorted((a, b) => a.name.localeCompare(b.name, 'es')),
      movements: sortMovements(movementItems),
      categories: sortCategories(categoryItems),
      status,
      error,
      dismissError,
      createProduct,
      updateProduct,
      deleteProduct,
      changeStock,
      assignBarcode,
      createCategory,
      renameCategory,
      deleteCategory,
      getPhoto,
      listPhotos,
      replaceAll,
    }),
    [
      productItems,
      movementItems,
      categoryItems,
      status,
      error,
      dismissError,
      createProduct,
      updateProduct,
      deleteProduct,
      changeStock,
      assignBarcode,
      createCategory,
      renameCategory,
      deleteCategory,
      getPhoto,
      listPhotos,
      replaceAll,
    ],
  )

  return <InventoryContext value={value}>{children}</InventoryContext>
}

function movementFor(
  product: Pick<Product, 'id' | 'name' | 'unit' | 'quantity'>,
  kind: MovementInput['kind'],
  amount: number,
  note: string,
): MovementInput {
  return {
    productId: product.id,
    productName: product.name,
    unit: product.unit,
    kind,
    amount,
    resultingQuantity: product.quantity,
    note,
  }
}
