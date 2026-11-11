import { describe, expect, it } from 'vitest'

import { makeCategory, makeMovement, makeProduct } from '@/test/factories'

import { BACKUP_APP, createBackup, parseBackup } from './backup'

const NOW = new Date('2026-11-11T12:00:00.000Z')

async function sampleBackup() {
  const category = makeCategory()
  const photoBytes = new Uint8Array([255, 216, 255, 0, 1, 2, 3])
  const photo = {
    id: 'photo-1',
    blob: new Blob([photoBytes], { type: 'image/jpeg' }),
    createdAt: NOW.toISOString(),
  }
  const product = makeProduct({ categoryId: category.id, photoId: photo.id })
  const movement = makeMovement({ productId: product.id })
  const backup = await createBackup(
    { products: [product], movements: [movement], categories: [category], photos: [photo] },
    NOW,
  )
  return { backup, product, movement, category, photoBytes }
}

describe('backup', () => {
  it('round-trips everything, photos included', async () => {
    const { backup, product, movement, category, photoBytes } = await sampleBackup()
    const result = parseBackup(JSON.stringify(backup))

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.snapshot.products).toEqual([product])
    expect(result.snapshot.movements).toEqual([movement])
    expect(result.snapshot.categories).toEqual([category])
    const [photo] = result.snapshot.photos
    expect(photo?.blob.type).toBe('image/jpeg')
    expect(new Uint8Array(await (photo?.blob ?? new Blob()).arrayBuffer())).toEqual(photoBytes)
  })

  it.each([
    ['not json', 'El archivo no es un JSON válido.'],
    [JSON.stringify({ app: 'diario' }), 'Este archivo no es una copia de seguridad de Almacén.'],
    [
      JSON.stringify({ app: BACKUP_APP, version: 99 }),
      'La copia es de una versión más nueva de la app. Actualízala e inténtalo de nuevo.',
    ],
  ])('rejects %s', (text, error) => {
    expect(parseBackup(text)).toEqual({ ok: false, error })
  })

  it('rejects products with invalid data or missing references', async () => {
    const { backup } = await sampleBackup()
    const broken = { ...backup, products: [{ ...backup.products[0], quantity: -1 }] }
    expect(parseBackup(JSON.stringify(broken))).toEqual({
      ok: false,
      error: 'La copia contiene productos con datos no válidos.',
    })

    const orphan = { ...backup, categories: [] }
    expect(parseBackup(JSON.stringify(orphan))).toEqual({
      ok: false,
      error: 'La copia contiene productos con categorías o fotos que faltan.',
    })
  })

  it('rejects damaged photos', async () => {
    const { backup } = await sampleBackup()
    const damaged = { ...backup, photos: [{ ...backup.photos[0], data: '%%%' }] }
    expect(parseBackup(JSON.stringify(damaged))).toEqual({
      ok: false,
      error: 'La copia contiene fotos dañadas.',
    })
  })
})
