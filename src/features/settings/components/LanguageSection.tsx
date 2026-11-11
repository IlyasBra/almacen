import { type ChangeEvent, useId } from 'react'

import { inputClassName } from '@/components/ui/styles'
import { isLanguage, type LanguagePreference, LANGUAGE_NAMES, LANGUAGES, useI18n } from '@/i18n'

/** Picks the interface language, or "automatic" to follow the phone. */
export function LanguageSection() {
  const { t, preference, language, setPreference } = useI18n()
  const selectId = useId()

  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    const value = event.target.value
    setPreference(isLanguage(value) ? value : 'auto')
  }

  const value: LanguagePreference = preference

  return (
    <section aria-labelledby="language-heading" className="space-y-2">
      <h3 id="language-heading" className="text-base font-semibold">
        {t('language.title')}
      </h3>
      <label htmlFor={selectId} className="sr-only">
        {t('language.label')}
      </label>
      <select id={selectId} value={value} onChange={handleChange} className={inputClassName}>
        <option value="auto">{t('language.auto')}</option>
        {LANGUAGES.map((code) => (
          // Each name in its own language, so people can find theirs.
          <option key={code} value={code} lang={code}>
            {LANGUAGE_NAMES[code]}
          </option>
        ))}
      </select>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        {t('language.hint')}
        {preference === 'auto' && ` (${LANGUAGE_NAMES[language]})`}
      </p>
    </section>
  )
}
