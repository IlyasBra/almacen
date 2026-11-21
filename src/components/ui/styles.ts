/**
 * Shared look for text inputs, selects and textareas.
 * text-base (16px) stops iOS Safari from zooming in when a field is focused.
 */
export const inputClassName =
  'block w-full rounded-lg border-0 bg-white px-3 py-2.5 text-base text-slate-900 ring-1 ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-500 focus:outline-none aria-[invalid=true]:ring-red-500 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600'

/** Pill buttons used to filter by category. */
export const chipClassName =
  'inline-flex h-9 shrink-0 items-center rounded-full px-3.5 text-sm font-medium ring-1 transition-colors'
export const chipOff =
  'bg-white text-slate-700 ring-slate-300 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700'
export const chipOn =
  'bg-slate-900 text-white ring-slate-900 dark:bg-white dark:text-slate-900 dark:ring-white'
