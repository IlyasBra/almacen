import { createRepositories, type Repositories } from './createRepositories'

let repositoriesPromise: Promise<Repositories> | undefined

/**
 * Opens the database once per page load and caches the promise, so React
 * can suspend on it with use() without reopening on every render.
 */
export function getRepositories(): Promise<Repositories> {
  repositoriesPromise ??= createRepositories()
  return repositoriesPromise
}
