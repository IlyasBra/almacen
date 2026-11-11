/** Languages the interface is available in. Spanish is the source language. */
export const LANGUAGES = ['es', 'en', 'fr', 'ar', 'it', 'de'] as const
export type Language = (typeof LANGUAGES)[number]

/** Used when the device language is not one of ours. */
export const FALLBACK_LANGUAGE: Language = 'en'

/** Each language written in itself, so people can find theirs whatever the current one. */
export const LANGUAGE_NAMES: Record<Language, string> = {
  es: 'Español',
  en: 'English',
  fr: 'Français',
  ar: 'العربية',
  it: 'Italiano',
  de: 'Deutsch',
}

const RTL_LANGUAGES: readonly Language[] = ['ar']

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value)
}

export function isRtl(language: Language): boolean {
  return RTL_LANGUAGES.includes(language)
}

/** Maps a BCP 47 tag ("fr-CA", "pt") to one of our languages, if any. */
export function matchLanguage(tag: string): Language | null {
  const base = tag.toLowerCase().split('-')[0]
  return isLanguage(base) ? base : null
}

/**
 * The first of the device's preferred languages that we support, e.g.
 * ["pt-BR", "fr-FR", "en"] → "fr". Falls back to English.
 */
export function detectDeviceLanguage(preferred: readonly string[] = navigator.languages): Language {
  for (const tag of preferred) {
    const match = matchLanguage(tag)
    if (match) return match
  }
  return FALLBACK_LANGUAGE
}

/**
 * Locale for Intl. Arabic is pinned to Western digits so dates match the
 * numbers shown elsewhere in the interface.
 */
export function intlLocale(language: Language): string {
  return language === 'ar' ? 'ar-u-nu-latn' : language
}
