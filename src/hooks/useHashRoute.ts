import { useEffect, useState } from 'react'

function readHashRoute<T extends string>(routes: readonly T[]): T | null {
  const hash = decodeURIComponent(window.location.hash.slice(1))
  return routes.find((route) => route === hash) ?? null
}

/**
 * Minimal hash router: "#hoy", "#proximos"… Hash URLs work on any static
 * host (GitHub Pages has no server-side rewrites) and need no library.
 * Unknown hashes, like the skip link's "#main-content", are ignored.
 */
export function useHashRoute<T extends string>(routes: readonly T[], fallback: T): T {
  const [route, setRoute] = useState<T>(() => readHashRoute(routes) ?? fallback)

  useEffect(() => {
    const handleHashChange = () => {
      const next = readHashRoute(routes)
      if (next) setRoute(next)
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => {
      window.removeEventListener('hashchange', handleHashChange)
    }
  }, [routes])

  return route
}
