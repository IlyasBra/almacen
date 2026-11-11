import { type ReactNode } from 'react'

interface FieldProps {
  label: string
  htmlFor: string
  /** Id given to the error message, to link it with aria-describedby. */
  errorId: string
  error?: string | undefined
  children: ReactNode
}

/** Label + control + error message, correctly linked for screen readers. */
export function Field({ label, htmlFor, errorId, error, children }: FieldProps) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      {children}
      {error && (
        <p id={errorId} className="mt-1.5 text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  )
}
