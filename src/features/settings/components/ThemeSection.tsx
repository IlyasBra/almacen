import { SegmentedControl, type SegmentedOption } from '@/components/ui/SegmentedControl'

import { type ThemePreference } from '../theme'

const OPTIONS: readonly SegmentedOption<ThemePreference>[] = [
  { value: 'system', label: 'Sistema' },
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Oscuro' },
]

interface ThemeSectionProps {
  preference: ThemePreference
  onChange: (preference: ThemePreference) => void
}

export function ThemeSection({ preference, onChange }: ThemeSectionProps) {
  return (
    <section aria-labelledby="theme-heading" className="space-y-2">
      <h3 id="theme-heading" className="text-base font-semibold">
        Apariencia
      </h3>
      <SegmentedControl
        legend="Tema"
        hideLegend
        options={OPTIONS}
        value={preference}
        onChange={onChange}
      />
      <p className="text-sm text-slate-600 dark:text-slate-400">
        «Sistema» sigue el modo claro u oscuro de tu móvil.
      </p>
    </section>
  )
}
