export interface Entity {
  id: string
}

/**
 * Data access contract shared by every feature (tasks, reminders…).
 *
 * The UI only talks to this interface. Today it is backed by IndexedDB
 * (Dexie); a future backend only needs another implementation, e.g. an
 * HttpRepository, without touching any component.
 */
export interface Repository<T extends Entity, Input, Changes> {
  list(): Promise<T[]>
  create(input: Input): Promise<T>
  update(id: string, changes: Changes): Promise<T>
  remove(id: string): Promise<void>
  /** Stores an item with its own id, creating or overwriting it (used to undo a delete). */
  put(item: T): Promise<void>
  /** Replaces every stored item at once (used to restore a backup). All or nothing. */
  replaceAll(items: readonly T[]): Promise<void>
}

/**
 * Pure domain rules for one entity type. Every repository implementation
 * uses the same model, so they cannot disagree on how data is built.
 */
export interface EntityModel<T extends Entity, Input, Changes> {
  build(input: Input, id: string, now: Date): T
  applyChanges(entity: T, changes: Changes, now: Date): T
}

export class EntityNotFoundError extends Error {
  constructor(id: string) {
    super(`Entity "${id}" not found`)
    this.name = 'EntityNotFoundError' // Not "NotFoundError": Dexie rewraps errors with that name
  }
}
