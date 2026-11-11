import { type Table } from 'dexie'

import {
  type Entity,
  type EntityModel,
  EntityNotFoundError,
  type Repository,
} from '@/lib/data/repository'
import { createId } from '@/lib/id'

/** Repository backed by one IndexedDB table through Dexie. */
export class DexieRepository<T extends Entity, Input, Changes> implements Repository<
  T,
  Input,
  Changes
> {
  private readonly table: Table<T, string>
  private readonly model: EntityModel<T, Input, Changes>

  constructor(table: Table<T, string>, model: EntityModel<T, Input, Changes>) {
    this.table = table
    this.model = model
  }

  list(): Promise<T[]> {
    return this.table.toArray()
  }

  async create(input: Input): Promise<T> {
    const item = this.model.build(input, createId(), new Date())
    await this.table.add(item)
    return item
  }

  update(id: string, changes: Changes): Promise<T> {
    // Read and write in one transaction so concurrent updates cannot interleave.
    return this.table.db.transaction('rw', this.table, async () => {
      const current = await this.table.get(id)
      if (!current) throw new EntityNotFoundError(id)
      const next = this.model.applyChanges(current, changes, new Date())
      await this.table.put(next)
      return next
    })
  }

  async remove(id: string): Promise<void> {
    await this.table.delete(id)
  }

  async put(item: T): Promise<void> {
    await this.table.put(item)
  }

  replaceAll(items: readonly T[]): Promise<void> {
    // One transaction: if anything fails, the previous data stays untouched.
    return this.table.db.transaction('rw', this.table, async () => {
      await this.table.clear()
      await this.table.bulkPut([...items])
    })
  }
}
