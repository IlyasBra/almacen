import { type Category } from '@/features/categories/types'
import { type InventorySnapshot } from '@/features/inventory/InventoryContext'
import { MOVEMENT_KINDS, type Movement } from '@/features/movements/types'
import { type Photo } from '@/features/photos/photoStore'
import { isUnit } from '@/features/products/model'
import { t } from '@/i18n'
import { type Product } from '@/features/products/types'

export const BACKUP_APP = 'almacen'
export const BACKUP_VERSION = 1

/** A photo inside a backup file: the image bytes as base64 text. */
export interface BackupPhoto {
  id: string
  type: string
  data: string
  createdAt: string
}

/** Everything the app stores, in a format meant to be saved as a .json file. */
export interface BackupFile {
  app: typeof BACKUP_APP
  version: number
  /** ISO timestamp of the export. */
  exportedAt: string
  products: Product[]
  movements: Movement[]
  categories: Category[]
  photos: BackupPhoto[]
}

export type ParseBackupResult =
  { ok: true; snapshot: InventorySnapshot; exportedAt: string } | { ok: false; error: string }

export async function createBackup(snapshot: InventorySnapshot, now: Date): Promise<BackupFile> {
  const photos: BackupPhoto[] = []
  for (const photo of snapshot.photos) {
    photos.push({
      id: photo.id,
      type: photo.blob.type || 'image/jpeg',
      data: await blobToBase64(photo.blob),
      createdAt: photo.createdAt,
    })
  }
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    products: [...snapshot.products],
    movements: [...snapshot.movements],
    categories: [...snapshot.categories],
    photos,
  }
}

export function backupFileName(now: Date): string {
  return `almacen-copia-${now.toISOString().slice(0, 10)}.json`
}

/**
 * Parses and validates a backup. Imported files are untrusted input, so every
 * field is checked: a corrupt or foreign file must never reach the database.
 */
export function parseBackup(text: string): ParseBackupResult {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return fail(t('backup.invalidJson'))
  }

  if (!isRecord(data) || data.app !== BACKUP_APP) {
    return fail(t('backup.notBackup'))
  }
  if (typeof data.version !== 'number' || data.version > BACKUP_VERSION) {
    return fail(t('backup.newerVersion'))
  }
  if (
    !isTimestamp(data.exportedAt) ||
    !Array.isArray(data.products) ||
    !Array.isArray(data.movements) ||
    !Array.isArray(data.categories) ||
    !Array.isArray(data.photos)
  ) {
    return fail(t('backup.missingData'))
  }

  const categories = (data.categories as unknown[]).filter(isCategory)
  if (categories.length !== data.categories.length) return fail(t('backup.badCategories'))
  const products = (data.products as unknown[]).filter(isProduct)
  if (products.length !== data.products.length) return fail(t('backup.badProducts'))
  const movements = (data.movements as unknown[]).filter(isMovement)
  if (movements.length !== data.movements.length) return fail(t('backup.badMovements'))

  const photos: Photo[] = []
  for (const item of data.photos as unknown[]) {
    const photo = readPhoto(item)
    if (!photo) return fail(t('backup.badPhotos'))
    photos.push(photo)
  }

  if (
    hasDuplicateIds(products) ||
    hasDuplicateIds(movements) ||
    hasDuplicateIds(categories) ||
    hasDuplicateIds(photos)
  ) {
    return fail(t('backup.duplicates'))
  }
  const categoryIds = new Set(categories.map((category) => category.id))
  const photoIds = new Set(photos.map((photo) => photo.id))
  if (
    products.some(
      (product) =>
        (product.categoryId !== null && !categoryIds.has(product.categoryId)) ||
        (product.photoId !== null && !photoIds.has(product.photoId)),
    )
  ) {
    return fail(t('backup.missingReferences'))
  }

  return {
    ok: true,
    exportedAt: data.exportedAt,
    snapshot: { products, movements, categories, photos },
  }
}

function fail(error: string): ParseBackupResult {
  return { ok: false, error }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasDuplicateIds(items: readonly { id: string }[]): boolean {
  return new Set(items.map((item) => item.id)).size !== items.length
}

function isTimestamp(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value))
}

function isId(value: unknown): value is string {
  return typeof value === 'string' && value !== ''
}

function isAmount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function isCategory(value: unknown): value is Category {
  return (
    isRecord(value) &&
    isId(value.id) &&
    typeof value.name === 'string' &&
    value.name.trim() !== '' &&
    isTimestamp(value.createdAt) &&
    isTimestamp(value.updatedAt)
  )
}

function isProduct(value: unknown): value is Product {
  return (
    isRecord(value) &&
    isId(value.id) &&
    typeof value.name === 'string' &&
    value.name.trim() !== '' &&
    typeof value.barcode === 'string' &&
    (value.categoryId === null || isId(value.categoryId)) &&
    isUnit(value.unit) &&
    isAmount(value.quantity) &&
    isAmount(value.minimum) &&
    typeof value.location === 'string' &&
    typeof value.notes === 'string' &&
    (value.photoId === null || isId(value.photoId)) &&
    isTimestamp(value.createdAt) &&
    isTimestamp(value.updatedAt)
  )
}

function isMovement(value: unknown): value is Movement {
  return (
    isRecord(value) &&
    isId(value.id) &&
    isId(value.productId) &&
    typeof value.productName === 'string' &&
    typeof value.unit === 'string' &&
    typeof value.kind === 'string' &&
    (MOVEMENT_KINDS as readonly string[]).includes(value.kind) &&
    isAmount(value.amount) &&
    isAmount(value.resultingQuantity) &&
    typeof value.note === 'string' &&
    isTimestamp(value.createdAt)
  )
}

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

function readPhoto(value: unknown): Photo | null {
  if (!(
    isRecord(value) &&
    isId(value.id) &&
    typeof value.type === 'string' &&
    IMAGE_TYPES.includes(value.type) &&
    typeof value.data === 'string' &&
    isTimestamp(value.createdAt)
  )) {
    return null
  }
  const bytes = base64ToBytes(value.data)
  if (!bytes) return null
  return { id: value.id, blob: new Blob([bytes], { type: value.type }), createdAt: value.createdAt }
}

async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  // Chunks keep String.fromCharCode under the argument limit for big photos.
  for (let start = 0; start < bytes.length; start += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(start, start + 0x8000))
  }
  return btoa(binary)
}

function base64ToBytes(data: string): Uint8Array<ArrayBuffer> | null {
  try {
    const binary = atob(data)
    const bytes = new Uint8Array(binary.length)
    for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index)
    return bytes
  } catch {
    return null
  }
}
