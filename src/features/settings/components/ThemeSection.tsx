import { SegmentedControl, type SegmentedOption } from '@/components/ui/SegmentedControl'

import { useI18n } from '@/i18n'

import { type ThemePreference } from '../theme'

interface ThemeSectionProps {
  preference: ThemePreference
  onChange: (preference: ThemePreference) => void
}

export function ThemeSection({ preference, onChange }: ThemeSectionProps) {
  const { t } = useI18n()
  const options: readonly SegmentedOption<ThemePreference>[] = [
    { value: 'system', label: t('theme.system') },
    { value: 'light', label: t('theme.light') },
    { value: 'dark', label: t('theme.dark') },
  ]

  return (
    <section aria-labelledby="theme-heading" className="space-y-2">
      <h3 id="theme-heading" className="text-base font-semibold">
        {t('settings.appearance')}
      </h3>
      <SegmentedControl
        legend={t('theme.legend')}
        hideLegend
        options={options}
        value={preference}
        onChange={onChange}
      />
      <p className="text-sm text-slate-600 dark:text-slate-400">{t('theme.hint')}</p>
    </section>
  )
}
