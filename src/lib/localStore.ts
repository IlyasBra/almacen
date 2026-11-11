/**
 * Small JSON wrapper around localStorage for device-local preferences.
 * localStorage can be missing or throw (private mode, sandboxed frames,
 * quota), so every access is guarded and falls back to the default.
 */
export function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key)
    return raw === null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

export function writeLocal(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Not critical: the preference simply is not remembered.
  }
}
