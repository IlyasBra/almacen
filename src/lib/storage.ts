/**
 * Asks the browser not to evict our data when the device runs low on space.
 * Without this, IndexedDB is "best effort" and may be cleared. Resolves to
 * whether storage is now persistent (false when unsupported or refused).
 */
export async function requestPersistentStorage(): Promise<boolean> {
  // Absent in insecure contexts and some embedded frames, despite the type.
  const storage = (navigator as { storage?: StorageManager }).storage
  if (!storage) return false
  try {
    if (await storage.persisted()) return true
    return await storage.persist()
  } catch {
    return false
  }
}
