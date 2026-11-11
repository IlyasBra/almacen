/** A group of products, e.g. "Bebidas". */
export interface Category {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

export type CategoryInput = Pick<Category, 'name'>
export type CategoryChanges = Partial<CategoryInput>
