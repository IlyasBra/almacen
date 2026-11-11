import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { type Repositories } from '@/db/createRepositories'
import { categoryModel, sortCategories } from '@/features/categories/model'
import { movementModel, sortMovements } from '@/features/movements/model'
import { type MovementInput } from '@/features/movements/types'
import { clampQuantity, productModel, roundQuantity } from '@/features/products/model'
import { type Product, type ProductInput } from '@/features/products/types'
import { type StoreErrorMessages, useRepositoryStore } from '@/hooks/useRepositoryStore'
import { useI18n } from '@/i18n'

import {
  InventoryContext,
  type InventoryContextValue,
  type InventorySnapshot,
  type PhotoChange,
} from './InventoryContext'

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
  const { t } = useI18n()
  const productMessages = useMemo<StoreErrorMessages>(
    () => ({
      create: t('store.product.create'),
      update: t('store.product.update'),
      remove: t('store.product.remove'),
      replace: t('store.product.replace'),
    }),
    [t],
  )
  const movementMessages = useMemo<StoreErrorMessages>(
    () => ({
      create: t('store.movement.create'),
      update: t('store.movement.create'),
      remove: t('store.movement.create'),
      replace: t('store.movement.replace'),
    }),
    [t],
  )
  const categoryMessages = useMemo<StoreErrorMessages>(
    () => ({
      create: t('store.category.create'),
      update: t('store.category.update'),
      remove: t('store.category.remove'),
      replace: t('store.category.replace'),
    }),
    [t],
  )
  const {
    items: productItems,
    status: productStatus,
    error: productError,
    dismissError: dismissProductError,
    create: insertProduct,
    update: patchProduct,
    remove: removeProduct,
    replaceAll: replaceProducts,
  } = useRepositoryStore(repositories.products, productModel, productMessages)
  const {
    items: movementItems,
    status: movementStatus,
    error: movementError,
    dismissError: dismissMovementError,
    create: logMovement,
    replaceAll: replaceMovements,
  } = useRepositoryStore(repositories.movements, movementModel, movementMessages)
  const {
    items: categoryItems,
    status: categoryStatus,
    error: categoryError,
    dismissError: dismissCategoryError,
    create: insertCategory,
    update: patchCategory,
    remove: removeCategory,
    replaceAll: replaceCategories,
  } = useRepositoryStore(repositories.categories, categoryModel, categoryMessages)
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
          setPhotoError(t('store.photo.save'))
          return null
        }
      }
      const product = await insertProduct({ ...input, photoId })
      if (!product) {
        if (photoId) await photos.remove(photoId).catch(() => undefined)
        return null
      }
      if (product.quantity > 0) {
        await logMovement(movementFor(product, 'new', product.quantity, ''))
      }
      return product
    },
    [photos, insertProduct, logMovement, t],
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
          setPhotoError(t('store.photo.save'))
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
            '',
          ),
        )
      }
      return true
    },
    [photos, patchProduct, logMovement, t],
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
        setPhotoError(t('store.photo.replace'))
        return false
      }
      return (
        (await replaceCategories(snapshot.categories)) &&
        (await replaceProducts(snapshot.products)) &&
        (await replaceMovements(snapshot.movements))
      )
    },
    [photos, replaceCategories, replaceProducts, replaceMovements, t],
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
      products: productItems.toSorted((a, b) => a.name.localeCompare(b.name)),
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
