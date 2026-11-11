import { createId } from '@/lib/id'

import { type Entity, type EntityModel, EntityNotFoundError, type Repository } from './repository'

/**
 * Keeps data in memory only. Used when the browser blocks IndexedDB
 * (some private modes and sandboxed frames) and in tests.
 */
export class InMemoryRepository<T extends Entity, Input, Changes> implements Repository<
  T,
  Input,
  Changes
> {
  private readonly items = new Map<string, T>()
  private readonly model: EntityModel<T, Input, Changes>

  constructor(model: EntityModel<T, Input, Changes>, initialItems: readonly T[] = []) {
    this.model = model
    for (const item of initialItems) this.items.set(item.id, item)
  }

  list(): Promise<T[]> {
    return Promise.resolve([...this.items.values()])
  }

  create(input: Input): Promise<T> {
    const item = this.model.build(input, createId(), new Date())
    this.items.set(item.id, item)
    return Promise.resolve(item)
  }

  update(id: string, changes: Changes): Promise<T> {
    const current = this.items.get(id)
    if (!current) return Promise.reject(new EntityNotFoundError(id))
    const next = this.model.applyChanges(current, changes, new Date())
    this.items.set(id, next)
    return Promise.resolve(next)
  }

  remove(id: string): Promise<void> {
    this.items.delete(id)
    return Promise.resolve()
  }

  put(item: T): Promise<void> {
    this.items.set(item.id, item)
    return Promise.resolve()
  }

  replaceAll(items: readonly T[]): Promise<void> {
    this.items.clear()
    for (const item of items) this.items.set(item.id, item)
    return Promise.resolve()
  }
}
