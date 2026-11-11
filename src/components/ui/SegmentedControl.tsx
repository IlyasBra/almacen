import { useId } from 'react'

import { cn } from '@/lib/cn'

export interface SegmentedOption<V extends string> {
  value: V
  label: string
  /** Classes for the selected state; uses `peer-checked:` variants. */
  selectedClassName?: string
}

interface SegmentedControlProps<V extends string> {
  legend: string
  /** Hide the legend visually when the context already explains it. */
  hideLegend?: boolean
  options: readonly SegmentedOption<V>[]
  value: V
  onChange: (value: V) => void
}

const DEFAULT_SELECTED =
  'peer-checked:bg-white peer-checked:text-slate-900 peer-checked:shadow-sm dark:peer-checked:bg-slate-600 dark:peer-checked:text-white'

/**
 * Segmented control built from real radio buttons inside a fieldset, so
 * screen readers announce it as a group and arrow keys move the selection.
 */
export function SegmentedControl<V extends string>({
  legend,
  hideLegend = false,
  options,
  value,
  onChange,
}: SegmentedControlProps<V>) {
  const name = useId()

  return (
    <fieldset>
      <legend className={cn('mb-1.5 block text-sm font-medium', hideLegend && 'sr-only')}>
        {legend}
      </legend>
      <div className="flex gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
        {options.map((option) => (
          <label key={option.value} className="relative flex-1">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => {
                onChange(option.value)
              }}
              className="peer sr-only"
            />
            <span
              className={cn(
                'flex h-10 cursor-pointer items-center justify-center rounded-md px-2 text-center text-sm font-medium text-slate-700 transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-500 dark:text-slate-300',
                option.selectedClassName ?? DEFAULT_SELECTED,
              )}
            >
              {option.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
