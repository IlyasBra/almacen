import { t } from '@/i18n'
import { type EntityModel } from '@/lib/data/repository'

import { type Category, type CategoryChanges, type CategoryInput } from './types'

export const CATEGORY_NAME_MAX_LENGTH = 30

export function buildCategory(input: CategoryInput, id: string, now: Date): Category {
  const timestamp = now.toISOString()
  return { id, name: input.name.trim(), createdAt: timestamp, updatedAt: timestamp }
}

export function applyCategoryChanges(
  category: Category,
  changes: CategoryChanges,
  now: Date,
): Category {
  return {
    ...category,
    name: (changes.name ?? category.name).trim(),
    updatedAt: now.toISOString(),
  }
}

export const categoryModel: EntityModel<Category, CategoryInput, CategoryChanges> = {
  build: buildCategory,
  applyChanges: applyCategoryChanges,
}

/** `others` are the other categories, to reject duplicated names (ignoring case). */
export function validateCategoryName(name: string, others: readonly Category[]): string | null {
  const trimmed = name.trim()
  if (trimmed.length === 0) return t('error.nameRequired')
  if (trimmed.length > CATEGORY_NAME_MAX_LENGTH)
    return t('error.nameTooLong', { max: CATEGORY_NAME_MAX_LENGTH })
  if (others.some((category) => category.name.toLowerCase() === trimmed.toLowerCase()))
    return t('error.categoryExists')
  return null
}

/** Alphabetical, the way Spanish speakers expect (á next to a). */
export function sortCategories(categories: readonly Category[]): Category[] {
  return categories.toSorted((a, b) => a.name.localeCompare(b.name))
}
