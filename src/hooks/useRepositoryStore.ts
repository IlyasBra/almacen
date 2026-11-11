import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { type Entity, type EntityModel, type Repository } from '@/lib/data/repository'

export type StoreStatus = 'loading' | 'ready' | 'error'

/** User-facing messages shown when an action fails. */
export interface StoreErrorMessages {
  create: string
  update: string
  remove: string
  replace: string
}

export interface RepositoryStore<T extends Entity, Input, Changes> {
  items: T[]
  status: StoreStatus
  /** Last failed action, shown to the user. */
  error: string | null
  dismissError: () => void
  /** Resolves to the new item, or null if saving failed. */
  create: (input: Input) => Promise<T | null>
  /** Each other action resolves to true on success, so forms know when to close. */
  update: (id: string, changes: Changes) => Promise<boolean>
  remove: (id: string) => Promise<boolean>
  /** Replaces all items (restoring a backup). Resolves to true on success. */
  replaceAll: (items: readonly T[]) => Promise<boolean>
  /** Puts a previously deleted item back, with its original id. */
  restore: (item: T) => Promise<boolean>
}

/**
 * Loads a repository into React state and exposes create/update/remove.
 *
 * Updates and removals are optimistic: the UI changes immediately (a
 * checkbox must react on tap) and rolls back if saving fails.
 * `model` and `messages` must be stable (module-level constants).
 */
export function useRepositoryStore<T extends Entity, Input, Changes>(
  repository: Repository<T, Input, Changes>,
  model: EntityModel<T, Input, Changes>,
  messages: StoreErrorMessages,
): RepositoryStore<T, Input, Changes> {
  const [items, setItems] = useState<T[]>([])
  const [status, setStatus] = useState<StoreStatus>('loading')
  const [error, setError] = useState<string | null>(null)

  // Latest items for the callbacks, without re-creating them on every change.
  const itemsRef = useRef(items)
  useEffect(() => {
    itemsRef.current = items
  }, [items])

  useEffect(() => {
    let cancelled = false
    repository.list().then(
      (list) => {
        if (cancelled) return
        setItems(list)
        setStatus('ready')
      },
      (reason: unknown) => {
        console.error(reason)
        if (!cancelled) setStatus('error')
      },
    )
    return () => {
      cancelled = true
    }
  }, [repository])

  // Writes run one after another, in the order the user made them. Otherwise a
  // quick "undo" could reach the database before the action it reverts.
  const queueRef = useRef<Promise<unknown>>(Promise.resolve())
  // Latest update per item: older answers must not overwrite a newer optimistic state.
  const latestUpdateRef = useRef(new Map<string, number>())
  const updateCounterRef = useRef(0)

  /** Runs a repository call (after the pending ones) and turns failures into a user-facing message. */
  const attempt = useCallback(
    <R>(action: () => Promise<R>, message: string): Promise<R | undefined> => {
      const run = queueRef.current.then(async () => {
        try {
          setError(null)
          return await action()
        } catch (reason) {
          console.error(reason)
          setError(message)
          return undefined
        }
      })
      queueRef.current = run
      return run
    },
    [],
  )

  const create = useCallback(
    async (input: Input) => {
      const item = await attempt(() => repository.create(input), messages.create)
      if (item) setItems((current) => [...current, item])
      return item ?? null
    },
    [attempt, repository, messages],
  )

  const update = useCallback(
    async (id: string, changes: Changes) => {
      const previous = itemsRef.current.find((item) => item.id === id)
      if (!previous) return false

      const replace = (next: T) => {
        setItems((current) => current.map((item) => (item.id === id ? next : item)))
      }
      const version = ++updateCounterRef.current
      latestUpdateRef.current.set(id, version)
      replace(model.applyChanges(previous, changes, new Date()))

      const saved = await attempt(() => repository.update(id, changes), messages.update)
      // A newer update of the same item is already on screen: keep it.
      if (latestUpdateRef.current.get(id) === version) replace(saved ?? previous)
      return saved !== undefined
    },
    [attempt, repository, model, messages],
  )

  const remove = useCallback(
    async (id: string) => {
      const index = itemsRef.current.findIndex((item) => item.id === id)
      const previous = itemsRef.current[index]
      if (!previous) return false

      setItems((current) => current.filter((item) => item.id !== id))

      const done = await attempt(async () => {
        await repository.remove(id)
        return true
      }, messages.remove)
      if (!done) setItems((current) => current.toSpliced(index, 0, previous))
      return done === true
    },
    [attempt, repository, messages],
  )

  const replaceAll = useCallback(
    async (next: readonly T[]) => {
      const done = await attempt(async () => {
        await repository.replaceAll(next)
        return true
      }, messages.replace)
      if (done) setItems([...next])
      return done === true
    },
    [attempt, repository, messages],
  )

  const restore = useCallback(
    async (item: T) => {
      const done = await attempt(async () => {
        await repository.put(item)
        return true
      }, messages.create)
      if (done) setItems((current) => [...current.filter((other) => other.id !== item.id), item])
      return done === true
    },
    [attempt, repository, messages],
  )

  const dismissError = useCallback(() => {
    setError(null)
  }, [])

  return useMemo(
    () => ({ items, status, error, dismissError, create, update, remove, replaceAll, restore }),
    [items, status, error, dismissError, create, update, remove, replaceAll, restore],
  )
}
