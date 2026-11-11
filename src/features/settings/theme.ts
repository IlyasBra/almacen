import { readLocal, writeLocal } from '@/lib/localStore'

export const THEME_PREFERENCES = ['system', 'light', 'dark'] as const
export type ThemePreference = (typeof THEME_PREFERENCES)[number]

export const THEME_STORAGE_KEY = 'almacen:theme'

/** Colours of the browser/status bar. Keep in sync with the script in index.html. */
export const THEME_COLORS = { light: '#f8fafc', dark: '#0f172a' } as const

export function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === 'string' && (THEME_PREFERENCES as readonly string[]).includes(value)
}

export function readThemePreference(): ThemePreference {
  const stored = readLocal<unknown>(THEME_STORAGE_KEY, 'system')
  return isThemePreference(stored) ? stored : 'system'
}

export function saveThemePreference(preference: ThemePreference): void {
  writeLocal(THEME_STORAGE_KEY, preference)
}

/** "system" follows the device; the other two override it. */
export function resolveIsDark(preference: ThemePreference, systemPrefersDark: boolean): boolean {
  return preference === 'dark' || (preference === 'system' && systemPrefersDark)
}

/** Applies the theme to the page: the `dark` class and the status bar colour. */
export function applyTheme(isDark: boolean): void {
  document.documentElement.classList.toggle('dark', isDark)
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', isDark ? THEME_COLORS.dark : THEME_COLORS.light)
}
