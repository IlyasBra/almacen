import { readLocal, writeLocal } from '@/lib/localStore'

import { detectDeviceLanguage, isLanguage, type Language } from './languages'

/** "auto" follows the device; any language overrides it. */
export type LanguagePreference = 'auto' | Language

export const LANGUAGE_STORAGE_KEY = 'almacen:language'

type Listener = () => void

function readPreference(): LanguagePreference {
  const stored = readLocal<unknown>(LANGUAGE_STORAGE_KEY, 'auto')
  return isLanguage(stored) ? stored : 'auto'
}

function resolve(preference: LanguagePreference): Language {
  return preference === 'auto' ? detectDeviceLanguage() : preference
}

let preference = readPreference()
let language = resolve(preference)
const listeners = new Set<Listener>()

export function getLanguage(): Language {
  return language
}

export function getLanguagePreference(): LanguagePreference {
  return preference
}

export function subscribeToLanguage(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Changes the language and tells every subscribed component. */
export function setLanguagePreference(
  next: LanguagePreference,
  options: { persist?: boolean } = {},
): void {
  const { persist = true } = options
  preference = next
  language = resolve(next)
  if (persist) writeLocal(LANGUAGE_STORAGE_KEY, next)
  for (const listener of listeners) listener()
}

/** Picks the language again from storage and the device (the user's language settings may have changed). */
export function refreshLanguage(): void {
  setLanguagePreference(readPreference(), { persist: false })
}
