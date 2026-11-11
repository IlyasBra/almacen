import { type Table } from 'dexie'

import { createId } from '@/lib/id'

/** A product photo, stored as a binary Blob on the device. */
export interface Photo {
  id: string
  blob: Blob
  createdAt: string
}

/** Storage for product photos. Products only keep the photo id. */
export interface PhotoStore {
  get(id: string): Promise<Blob | undefined>
  /** Stores a new photo and resolves to its id. */
  add(blob: Blob): Promise<string>
  remove(id: string): Promise<void>
  list(): Promise<Photo[]>
  /** Replaces every photo at once (restoring a backup). All or nothing. */
  replaceAll(photos: readonly Photo[]): Promise<void>
}

export class DexiePhotoStore implements PhotoStore {
  private readonly table: Table<Photo, string>

  constructor(table: Table<Photo, string>) {
    this.table = table
  }

  async get(id: string): Promise<Blob | undefined> {
    return (await this.table.get(id))?.blob
  }

  async add(blob: Blob): Promise<string> {
    const id = createId()
    await this.table.add({ id, blob, createdAt: new Date().toISOString() })
    return id
  }

  async remove(id: string): Promise<void> {
    await this.table.delete(id)
  }

  list(): Promise<Photo[]> {
    return this.table.toArray()
  }

  replaceAll(photos: readonly Photo[]): Promise<void> {
    return this.table.db.transaction('rw', this.table, async () => {
      await this.table.clear()
      await this.table.bulkPut([...photos])
    })
  }
}

export class InMemoryPhotoStore implements PhotoStore {
  private readonly photos = new Map<string, Photo>()

  constructor(initialPhotos: readonly Photo[] = []) {
    for (const photo of initialPhotos) this.photos.set(photo.id, photo)
  }

  get(id: string): Promise<Blob | undefined> {
    return Promise.resolve(this.photos.get(id)?.blob)
  }

  add(blob: Blob): Promise<string> {
    const id = createId()
    this.photos.set(id, { id, blob, createdAt: new Date().toISOString() })
    return Promise.resolve(id)
  }

  remove(id: string): Promise<void> {
    this.photos.delete(id)
    return Promise.resolve()
  }

  list(): Promise<Photo[]> {
    return Promise.resolve([...this.photos.values()])
  }

  replaceAll(photos: readonly Photo[]): Promise<void> {
    this.photos.clear()
    for (const photo of photos) this.photos.set(photo.id, photo)
    return Promise.resolve()
  }
}
