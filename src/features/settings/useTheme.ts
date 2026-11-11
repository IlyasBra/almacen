import { useCallback, useEffect, useState } from 'react'

import {
  applyTheme,
  readThemePreference,
  resolveIsDark,
  saveThemePreference,
  type ThemePreference,
} from './theme'

const DARK_QUERY = '(prefers-color-scheme: dark)'

/** Theme preference with persistence; follows the device while on "system". */
export function useTheme() {
  const [preference, setPreferenceState] = useState<ThemePreference>(readThemePreference)

  useEffect(() => {
    const query = window.matchMedia(DARK_QUERY)
    const update = () => {
      applyTheme(resolveIsDark(preference, query.matches))
    }
    update()
    query.addEventListener('change', update)
    return () => {
      query.removeEventListener('change', update)
    }
  }, [preference])

  const setPreference = useCallback((next: ThemePreference) => {
    saveThemePreference(next)
    setPreferenceState(next)
  }, [])

  return { preference, setPreference }
}
