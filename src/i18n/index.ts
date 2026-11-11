import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react'

import {
  detectDeviceLanguage,
  intlLocale,
  isLanguage,
  isRtl,
  LANGUAGE_NAMES,
  LANGUAGES,
  type Language,
} from './languages'
import { type MessageKey } from './messages/es'
import {
  getLanguage,
  getLanguagePreference,
  refreshLanguage,
  setLanguagePreference,
  subscribeToLanguage,
} from './store'
import { type Params, type PluralKey, translate, translatePlural } from './translate'

export { detectDeviceLanguage, intlLocale, isLanguage, isRtl, LANGUAGE_NAMES, LANGUAGES }
export type { Language, MessageKey, Params, PluralKey }
export { getLanguage, getLanguagePreference, setLanguagePreference }
export type { LanguagePreference } from './store'

/**
 * Translation for code that is not a component (validation, notifications,
 * backup). Components must use useI18n() so they re-render on language changes.
 */
export function t(key: MessageKey, params?: Params): string {
  return translate(getLanguage(), key, params)
}

export function tn(key: PluralKey, count: number, params?: Params): string {
  return translatePlural(getLanguage(), key, count, params)
}

/** The current language and its translation functions; re-renders when it changes. */
export function useI18n() {
  const language = useSyncExternalStore(subscribeToLanguage, getLanguage)
  const preference = useSyncExternalStore(subscribeToLanguage, getLanguagePreference)

  const translateKey = useCallback(
    (key: MessageKey, params?: Params) => translate(language, key, params),
    [language],
  )
  const translateCount = useCallback(
    (key: PluralKey, count: number, params?: Params) =>
      translatePlural(language, key, count, params),
    [language],
  )

  return useMemo(
    () => ({
      language,
      preference,
      dir: isRtl(language) ? ('rtl' as const) : ('ltr' as const),
      t: translateKey,
      tn: translateCount,
      setPreference: setLanguagePreference,
    }),
    [language, preference, translateKey, translateCount],
  )
}

/** Keeps <html lang dir> in sync and follows the device when its languages change. */
export function useDocumentLanguage(): void {
  const { language, dir } = useI18n()

  useEffect(() => {
    document.documentElement.lang = language
    document.documentElement.dir = dir
  }, [language, dir])

  useEffect(() => {
    window.addEventListener('languagechange', refreshLanguage)
    return () => {
      window.removeEventListener('languagechange', refreshLanguage)
    }
  }, [])
}
