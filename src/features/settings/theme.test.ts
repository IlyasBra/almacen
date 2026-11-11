import { afterEach, describe, expect, it } from 'vitest'

import {
  applyTheme,
  readThemePreference,
  resolveIsDark,
  saveThemePreference,
  THEME_STORAGE_KEY,
} from './theme'

describe('theme', () => {
  afterEach(() => {
    window.localStorage.clear()
    document.documentElement.classList.remove('dark')
  })

  it.each([
    ['system', true, true],
    ['system', false, false],
    ['light', true, false],
    ['dark', false, true],
  ] as const)('%s with system dark=%s resolves to dark=%s', (preference, system, expected) => {
    expect(resolveIsDark(preference, system)).toBe(expected)
  })

  it('defaults to the system theme and ignores invalid stored values', () => {
    expect(readThemePreference()).toBe('system')
    window.localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify('purple'))
    expect(readThemePreference()).toBe('system')
  })

  it('remembers the saved preference', () => {
    saveThemePreference('dark')
    expect(readThemePreference()).toBe('dark')
  })

  it('toggles the dark class on <html>', () => {
    applyTheme(true)
    expect(document.documentElement).toHaveClass('dark')
    applyTheme(false)
    expect(document.documentElement).not.toHaveClass('dark')
  })
})
